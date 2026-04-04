import { missingField, loadCss, showErrorBoxes } from "../styles.js";
import { $, routes, UserState, DDB } from "../root.js";
let loginButton = document.getElementById("login_button");
let regButton = document.getElementById("register_button");
regButton.onclick = () => (location.href = routes.register);
loginButton.onclick = Login;

loadCss();
const currUser = await DDB.get("account");
if (currUser) {
  location.href = routes.homepage;
}

async function Login() {
  try {
    let id = $("matrix_id_f").value.replace(" ", "");
    let key = $("matrix_key_f").value.replace(" ", "");
    if (id.length === 0 || key.length === 0) {
      id.length === 0 ? missingField("matrix_id") : missingField("matrix_key");
    } else {
      const user = await DDB.get(id);
      if (user) {
        if (user.matrix_key === key) {
          const old = await DDB.get(id);
          await DDB.delete(id);
          await DDB.set("account", old);
          location.href = routes.homepage;
        } else {
          showErrorBoxes("error_box", "invalid credentials", 5000, true);
        }
      } else {
        showErrorBoxes("error_box", "invalid credentials", 5000, true);
      }
    }
  } catch (e) {
    showErrorBoxes("error_box", "Unknown error.", 5000, true);
  }
}
