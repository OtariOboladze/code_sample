async function ajax_request(service, parameters, response_type) {
  return new Promise((resolves, rejects) => {
     //ajax request
     fetch(service, parameters)
        .then((response) => {
           if (response.ok) {
              switch (response_type) {
                 case "json":
                    return response.json();
                 case "text":
                    return response.text();
                 case "blob":
                    return response.blob();
                 default:
                    throw "response type is not valid";
              }
           } else {
              console.log(response);
              throw "something went wrong on ajax request";
           }
        })
        .then((message) => {
           //resolve server promise
           resolves(message);
           //give each inputs wo_number
        })
        .catch((error) => {
           //reject server response
           rejects(error);
        });
  });
}

let alert_message = (type, message) => {
  let alert = document.createElement("div");
  alert.classList.add("my-3");
  alert.innerHTML = `<div class="alert alert-${type} alert-outline-coloured alert-dismissible" role="alert">
                       <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                       <div class="alert-icon">
                          <i class="far fa-fw fa-bell"></i>
                       </div>
                       <div class="alert-message text-center">
                          <strong>${message}</strong>
                       </div>
                    </div>`;
  return alert;
};

//show everything when clicked on work-order row id ===============================================
document.querySelectorAll(".table_row").forEach((row) => {
  //mark row backgroud color
  mark_table_row_background_colors(row);

  row.addEventListener("click", () => {
     //enable buttons
     enable_buttons_after_row_click(row.getAttribute("transaction_state"));

     //mark clicked row
     document.querySelectorAll(".table_row").forEach((e) => {
        e.classList.remove("table-active");
        e.style.fontWeight = "normal";
     });
     row.classList.add("table-active");
     row.style.fontWeight = "900";

     //show/hide notify_to_peoples list
     if (row.getAttribute("transaction_state") == "all_wo") {
        document.querySelector("#update_sell_transaction_state").innerText = "Save and notify to..";
        document.querySelector("#notify_to_list").removeAttribute("hidden");
     } else {
        document.querySelector("#update_sell_transaction_state").innerText = "Save";
        document.querySelector("#notify_to_list").setAttribute("hidden", "");
     }

     //show/hide work-orders-amount input
     if (row.getAttribute("transaction_state") == "opened") {
        document.querySelector("#amount_of_work_orders_input").removeAttribute("hidden");
        document.querySelector("#all_inputs").setAttribute("hidden", "");

        document.querySelector("#transaction_state_hidden_text").removeAttribute("hidden", "");
        document.querySelector("#update_sell_transaction_state_form").setAttribute("hidden", "");

        document.querySelector("#save_s_n").setAttribute("hidden", "");
     } else {
        document.querySelector("#update_sell_transaction_state_form").removeAttribute("hidden");
        document.querySelector("#transaction_state_hidden_text").setAttribute("hidden", "");

        document.querySelector("#all_inputs").removeAttribute("hidden", "");
        document.querySelector("#amount_of_work_orders_input").setAttribute("hidden", "");

        document.querySelector("#save_s_n").removeAttribute("hidden", "");
     }

     //clear uploaded files div
     document.querySelector("#uploaded_documents").innerHTML = "";

     //show checked inputs and general info
     show_all_accordion_info(row.getAttribute("wo_number"));
  });
});

//show corresponding options and defaults when device is chosen ==================================
document.querySelector("[name='orderable_product']").addEventListener("change", () => {
  possible_hw_sw_adapter_inputs_by_device_id({
     product_at_code: document.querySelector("[name='orderable_product']").value,
     active_bundle_at_code: "",
  });
});

function possible_hw_sw_adapter_inputs_by_device_id(object_as_parameter) {
  let type = "post";
  let service = "web_services/order_details/show_hw_sw_adapters_options.php";
  let data = new FormData();
  data.append("device_at_code", object_as_parameter["product_at_code"]);
  let parameters = {
     method: type,
     body: data,
  };

  // console.log("device_id sent to server to show hw_sw_adapters options is", object_as_parameter["product_at_code"]);
  console.log("object as parameter is", object_as_parameter);

  ajax_request(service, parameters, "json").then(
     function (response) {
        console.log("server response for possible hw-sw-adapters options is", response);

        //clear hw_sw_adapters divs
        clear_components_after_device_change();

        show_device_possible_all_components(object_as_parameter, response);
        show_bundles(response["bundles"], object_as_parameter["active_bundle_at_code"]);
     },
     function (error) {
        console.log(error);
     }
  );
}

function bundle_defaults(checked_bundle_at_code) {
  // console.log("bundle radio buttons changed");

  //clear all marked inputs
  document.querySelectorAll(".toggle_value").forEach((input) => {
     make_element_inactive(input.getAttribute("name"));
  });

  let type = "post";
  let service = "web_services/order_details/show_bundle_defaults.php";
  let data = new FormData();
  data.append("bundle_at_code", checked_bundle_at_code);
  let parameters = {
     method: type,
     body: data,
  };

  ajax_request(service, parameters, "json").then(
     function (response) {
        console.log("bundle defaults are", response);

        //re-enable inputs if privious bundle disabled it
        document.querySelectorAll(".toggle_value").forEach((input) => {
           enable_element(input.getAttribute("name"));
        });

        //make elements active
        try {
           response["adapters"].forEach((input) => {
              make_element_active(input["adapter_at_code"], document.querySelector('[name="outgoing_product_amount"]').value);
              document.querySelector(`[at_code = "${input["adapter_at_code"]}"]`).style.backgroundColor = "orange";
           });
           response["hardware"].forEach((input) => {
              make_element_active(input["hw_option_at_code"], document.querySelector('[name="outgoing_product_amount"]').value);
              document.querySelector(`[at_code = "${input["hw_option_at_code"]}"]`).style.backgroundColor = "orange";
           });
           response["software"].forEach((input) => {
              make_element_active(input["sw_at_code"], document.querySelector('[name="outgoing_product_amount"]').value);
              document.querySelector(`[at_code = "${input["sw_at_code"]}"]`).style.backgroundColor = "orange";
           });
           response["excluded"].forEach((input) => {
              disable_element(input);
           });
        } catch (e) {
           console.log(e);
        }
     },
     function (error) {
        console.log(error);
     }
  );
}

//create new transaction ==========================================================================
document.querySelector("#create_new_transaction").addEventListener("click", () => {
  //check if required fields are not empty
  if (validate_new_transaction_fields() == false) {
     document.querySelector("#create_new_order_form").append(alert_message("warning", "You missed required fields"));
     return;
  }

  let type = "post";
  let service = "web_services/order_details/create_new_transaction.php";
  let data = new FormData(create_new_order_form);

  let parameters = {
     method: type,
     body: data,
  };

  console.log("form key-value sent to server is");
  for (let pair of data) {
     console.log(pair[0] + " - " + pair[1]);
  }

  ajax_request(service, parameters, "text").then(
     function (response) {
        // console.log("save button click server response sql insert is", response);
        if (response === "") {
           document
              .querySelector("#create_new_order_form")
              .append(alert_message("success", "Transaction info saved. <br/> Page will reload after closing this window."));
           document.querySelector("#create_new_transaction").setAttribute("disabled", "");

           //reload the page
           let delete_modal = document.querySelector("#new_order_modal");
           delete_modal.addEventListener("hide.bs.modal", () => {
              location.reload();
           });
        } else {
           document
              .querySelector("#create_new_order_form")
              .append(alert_message("danger", "Hmm.. something's wrong! call Oto, say some bad words and he'll fix it"));
           console.log("server response after creating new transaction is", response);
        }
     },
     function (error) {
        console.log(error);
     }
  );
});

(function sell_transaction_type_change() {
  document.querySelector("[name='sell_transaction_type']").addEventListener("change", function () {
     switch (this.value) {
        case "outgoing_device":
           disable_input_field("#s_n_input_field");
           enable_input_field("#po_input_field");
           enable_input_field("#wo_amount_input_field");
           break;
        case "outgoing_demo":
           disable_input_field("#s_n_input_field");
           enable_input_field("#po_input_field");
           enable_input_field("#wo_amount_input_field");
           break;
        case "incoming_device":
           enable_input_field("#s_n_input_field");
           disable_input_field("#po_input_field");
           disable_input_field("#wo_amount_input_field");
           break;
        case "trade_in":
           enable_input_field("#s_n_input_field");
           enable_input_field("#po_input_field");
           enable_input_field("#wo_amount_input_field");
           break;
     }
  });
})();

//make element inactive ===========================================================================
function make_element_inactive(input_name_tag) {
  //identify input element
  let input = document.querySelector(`[name="${input_name_tag}"]`);
  //empty input field
  input.value = "";
  //toggle corresponding checkbox
  let toggle = document.querySelector(`[at_code='${input_name_tag}']`);
  toggle.checked = false;
  //remove element from cart on right
  remove_element_from_cart(input);
  //remove background color
  input.parentElement.parentElement.removeAttribute("style");
  //remove toggle color
  toggle.style.backgroundColor = "white";
}


