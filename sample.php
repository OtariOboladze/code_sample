<?php

require_once '../../connection.php';
mysqli_set_charset($conn, "utf8");

$response = '';

//check for WO number =============================================================================
//check what's last WO number in db (if number exists), if not - create new
function check_wo_number()
{
	global $conn;
	$sql_wo_number = mysqli_query($conn, "SELECT work_order_number  
                                          FROM `sell_transaction_outgoing` 
                                          ORDER BY work_order_number DESC 
                                          LIMIT 1;");

	//if last WO number exists and is 7 char long, increment new wo number by one 
	if ($result_wo_number = mysqli_fetch_assoc($sql_wo_number)) {
		//check if year is correct, if not - start new year with different value W231000, W241000, W251000..
		if (substr($result_wo_number['work_order_number'], 1, 2) == date("y")) {
			//If years counter is the same as current year, increment wo number
			$work_order_digits = intval(substr($result_wo_number['work_order_number'], 1)) + 1;
			$work_order_number = 'W' . strval($work_order_digits);
		} else {
			//if its different year, increment years counter
			$work_order_number = 'W' . date("y") . '1000';
		}
	} else {
		//wo number doesnot exists in DB, create first entry row 
		$work_order_number = 'W' . date("y") . '1000';
	}
	return $work_order_number;
}

//check for RMA number ============================================================================
//check what's last rma number in db (if number exists), if not - create new
function check_rma_number()
{
	global $conn;
	$sql_rma_number = mysqli_query($conn, "SELECT rma_number FROM `sell_transaction_incoming` ORDER BY rma_number DESC LIMIT 1");
	// $result_rma_number = mysqli_fetch_assoc($sql_rma_number);
	//if last rma number exists and is 7 char long, increment new rma number by one 
	if ($result_rma_number = mysqli_fetch_assoc($sql_rma_number)) {
		//check if year is correct, if not - start new year with different value R231000, R241000, R251000..
		if (substr($result_rma_number['rma_number'], 1, 2) == date("y")) {
			//If years counter is the same as current year, increment rma number
			$rma_digits = intval(substr($result_rma_number['rma_number'], 1)) + 1;
			$rma_number = 'R' . strval($rma_digits);
		} else {
			//if its different year, increment years counter
			$rma_number = 'R' . date("y") . '0100';
		}
	} else {
		//wo number doesnot exists in DB, create first entry row 
		$rma_number = 'R' . date("y") . '0100';
	}
	return $rma_number;
}

//data sanitizer function =========================================================================
function sanitize_input($input)
{
	$input = trim($input);
	$input = addslashes($input);
	$input = htmlspecialchars($input);
	return $input;
}

//assign variables ================================================================================

$client_contact_id = sanitize_input($_POST['client_contact_id']);
$sell_transaction_type = sanitize_input($_POST['sell_transaction_type']);
$incoming_purchase_order = sanitize_input($_POST['incoming_purchase_order']);
$rma_s_n_array = explode(',', $_POST['rma_s_n']);
$transaction_comments = sanitize_input($_POST['transaction_comments']);
$due_date = sanitize_input($_POST['due_date']);


function insert_into_sell_transactions($transaction_type)
{
	global $conn;
	//insert new transaction =======================================================================
	$sql_new_transaction = "INSERT INTO `sell_transactions`(`client_contact_id`, `transaction_type`, `transaction_created_on`, `purchase_order`, `comments`) 
                           VALUES ('" . sanitize_input($_POST['client_contact_id']) . "', '$transaction_type', CURRENT_DATE(),'" . sanitize_input($_POST['incoming_purchase_order']) . "', '" . sanitize_input($_POST['transaction_comments']) . "') ";
	if (!mysqli_query($conn, $sql_new_transaction)) {
		throw new Exception(mysqli_error($conn));
	}

	return  mysqli_insert_id($conn);
}

function insert_into_sell_transactions_outgoing($sell_transaction_id, $demo_tag = '')
{
	global $conn;

	$last_wo_number = check_wo_number();

	$sql_sell_outgoing = "INSERT INTO `sell_transaction_outgoing` (work_order_number, sell_transaction_id , amount, wo_state, due_date, final_customer )
                                   VALUES ('$last_wo_number', '$sell_transaction_id', '1', 'opened', '" . sanitize_input($_POST['due_date']) . "', '" . sanitize_input($_POST['final_customer']) . "')";
	if (!mysqli_query($conn, $sql_sell_outgoing)) {
		throw new Exception(mysqli_error($conn));
	}


	//insert into demo trancastion if parameter is 'demo'
	if ($demo_tag == 'demo') {
		$new_demo = "INSERT INTO `demo_transactions` VALUES ('$last_wo_number', 'processing', NULL)";

		if (!mysqli_query($conn, $new_demo)) {
			throw new Exception(mysqli_error($conn));
		}
	}
}

function insert_into_sell_transaction_incoming($sell_transaction_id)
{
	global $conn;

	$rma_number = check_rma_number();

	//insert new transaction =======================================================================
	$sql_incoming = "INSERT INTO `sell_transaction_incoming`(`rma_number`, `sell_transaction_id`, `sell_transactions_incoming_state`)
                     VALUES ('$rma_number', '$sell_transaction_id', 'processing') ";
	if (!mysqli_query($conn, $sql_incoming)) {
		throw new Exception(mysqli_error($conn));
	}

	// $sell_transactions_incoming_devices_id = mysqli_insert_id($conn);

	return $rma_number;
}

function insert_into_rma_devices($rma_number, $sn, $rma_type)
{
	global $conn;
	//insert new transaction =======================================================================
	$sql = "INSERT INTO `42_rma_devices`(`rma_number`, `sn`, `rma_type`) 
                                 VALUES ('$rma_number', '$sn', '$rma_type') ";
	if (!mysqli_query($conn, $sql)) {
		throw new Exception(mysqli_error($conn));
	}
}

// try inserting values into DB, throw exception if error occures =================================
try {
	//start mysqli transaction =====================================================================
	mysqli_autocommit($conn, FALSE);

	switch ($sell_transaction_type) {
		case 'outgoing_device':

			$sell_transaction_last_row_id = insert_into_sell_transactions('outgoing_device');
			insert_into_sell_transactions_outgoing($sell_transaction_last_row_id);

			break;

		case 'demo':

			$sell_transaction_last_row_id = insert_into_sell_transactions('demo');
			insert_into_sell_transactions_outgoing($sell_transaction_last_row_id, 'demo');

			break;

		case 'incoming_device':

			// insert into sell_transactions ---------------------------------------------------------
			$sell_transaction_last_row_id = insert_into_sell_transactions('incoming_device');

			//insert into sell_transaction_incoming --------------------------------------------------
			$rma = insert_into_sell_transaction_incoming($sell_transaction_last_row_id);

			//insert into rma devices ----------------------------------------------------------------
			foreach ($rma_s_n_array as $value) {
				//check for empty elements
				if (trim($value) != '') {
					insert_into_rma_devices($rma, trim($value), 'repair');
				}
			}

			break;

		case 'trade_in':
			// insert into sell_transactions ---------------------------------------------------------
			$sell_transaction_last_row_id = insert_into_sell_transactions('trade_in');

			//insert into sell_transaction_incoming --------------------------------------------------
			$rma = insert_into_sell_transaction_incoming($sell_transaction_last_row_id);

			//insert into rma devices ----------------------------------------------------------------
			foreach ($rma_s_n_array as $value) {
				//check for empty elements
				if (trim($value) != '') {
					insert_into_rma_devices($rma, trim($value), 'trade_in');
				}
			}

			//insert into sell transaction outgoing --------------------------------------------------
			insert_into_sell_transactions_outgoing($sell_transaction_last_row_id);

			break;
	}


	//close mysqli transaction =====================================================================
	mysqli_commit($conn);
} catch (Exception $e) {

	//if something goes wrong, rollback mysqli transaction
	mysqli_rollback($conn);

	//create response for front-end
	echo $e->getMessage() . ' on line ' . $e->getLine() . ' in file ' . $e->getFile();
}

echo json_encode($sql_new_transaction);