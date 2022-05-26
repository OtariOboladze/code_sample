SELECT `sell_transaction_outgoing`.due_date ,  
					`sell_transaction_outgoing`.wo_state ,  
					`sell_transaction_outgoing`.device_outgoing_date ,  
					`sell_transaction_outgoing`.work_order_number ,  
					`sell_transaction_outgoing`.flavour_at_code ,  
					`sell_transaction_outgoing`.amount , 
					`sell_transactions`.transaction_created_on , 
					`sell_transactions`.purchase_order , 
					`sell_transactions`.comments , 
					clients_contact_details.mailing_country, 
					clients.account_name , 
					temp_table.sn , 
					DATEDIFF(CURRENT_DATE(), `sell_transactions`.transaction_created_on ) AS days_passed, 
					DATEDIFF(`sell_transaction_outgoing`.due_date , `sell_transactions`.transaction_created_on ) AS full_days_amount,
					`oem_skins_and_orderables`.name AS device ,
					`sell_transaction_types`.description AS tr_type,
					`demo_transactions`.demo_state,
					`sell_transaction_outgoing`.final_customer,
					`sell_transaction_incoming`.rma_number,
					`sell_transaction_outgoing`.order_confirmation,
					`work_order_state`.description,
					`sell_transaction_outgoing`.proforma,
					`sell_transaction_outgoing`.amount_eur,
					`sell_transactions`.sell_transaction_id,
					`sell_transaction_outgoing`.invoice, 
					`sell_transaction_outgoing`.delivery_date_start, 
					`sell_transaction_outgoing`.paid,
					DATEDIFF(CURRENT_DATE(), `sell_transaction_outgoing`.delivery_date_start) AS pay_days_passed,
					`clients`.payment_term
				FROM `sell_transaction_outgoing`
				INNER JOIN `sell_transactions`
				ON `sell_transactions`.sell_transaction_id = `sell_transaction_outgoing`.sell_transaction_id 
				INNER JOIN `work_order_state`
				ON `work_order_state`.state = `sell_transaction_outgoing`.wo_state 
				LEFT JOIN 
					(SELECT work_order_number AS wo_namba, GROUP_CONCAT(s_n) AS sn
					FROM `wo_sn`
					GROUP BY wo_namba) AS temp_table
				ON temp_table.wo_namba = `sell_transaction_outgoing`.work_order_number 
				INNER JOIN clients_contact_details
				ON clients_contact_details.id = `sell_transactions`.client_contact_id
				INNER JOIN clients
				ON clients.id_client =  clients_contact_details.client_id 
				LEFT JOIN `oem_skins_and_orderables`
				ON `oem_skins_and_orderables`.at_code = `sell_transaction_outgoing`.flavour_at_code 
				INNER JOIN `sell_transaction_types` 
				ON `sell_transaction_types`.type = `sell_transactions`.transaction_type 
				LEFT JOIN `demo_transactions`
                ON `demo_transactions`.work_order_number = `sell_transaction_outgoing`.work_order_number
				LEFT JOIN `sell_transaction_incoming`
				ON `sell_transaction_incoming`.sell_transaction_id = `sell_transactions`.sell_transaction_id