// Copyright (C) 2026 remohexa
// SPDX-License-Identifier: GPL-3.0
// Github: https://github.com/remohexa/rematrix-gallery
import { missingField, loadCss, showErrorBoxes } from "../styles.js";
import {
  api,
  $,
  checkUser,
  routes,
  UserState,
  connectionLost,
} from "../root.js";
let loginButton = document.getElementById("login_button");
let regButton = document.getElementById("register_button");
regButton.onclick = () => (location.href = routes.register);
loginButton.onclick = Login;

loadCss();
let st = await checkUser();
if (st === -1) {
  connectionLost({ hideId: "homePageLayout" });
} else if (st[0]) {
  location.href = routes.homepage;
}
async function Login() {
  try {
    let id = $("matrix_id_f").value.replace(" ", "");
    let key = $("matrix_key_f").value.replace(" ", "");
    if (id.length === 0 || key.length === 0) {
      id.length === 0 ? missingField("matrix_id") : missingField("matrix_key");
    } else {
      let res = await fetch(`${api.url}/${api.routes.login}`, {
        method: "POST",
        headers: api.headers,
        body: JSON.stringify({
          matrix_id: id,
          matrix_key: key,
        }),
      });
      if (res.status == 401) {
        showErrorBoxes("error_box", await res.text(), 5000, true);
      } else {
        UserState({ matrix_Id: id });
        location.href = routes.homepage;
      }
    }
  } catch (e) {
    showErrorBoxes("error_box", api.messages.lostcon, 5000, true);
  }
}
