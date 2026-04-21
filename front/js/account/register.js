// Copyright (C) 2026 remohexa
// SPDX-License-Identifier: GPL-3.0
// Github: https://github.com/remohexa/rematrix-gallery
import { missingField, loadCss, showErrorBoxes } from "../styles.js";
import {
  api,
  $,
  checkUser,
  routes,
  checkUserName,
  sleep,
  copyToClib,
  UserState,
  connectionLost,
  ReMatrixImage,
  buildMultiChoosesElement,
  FilePicker,
  uploadMedia,
} from "../root.js";
loadCss();
let st = await checkUser();
if (st === -1) {
  connectionLost({ hideId: "homePageLayout" });
} else if (st[0]) {
  location.href = routes.homepage;
}

const loginButton = $("login_button");
const regButton = $("register_button");
const regText = $("register_text");
const loginbox = $("loginbox");
const cridbox = $("cridbox");
const cridMatrixId = $("matrix_id_f");
const cridMatrixKey = $("matrix_key_f");
const cridCopyButton = $("copy_button");
const cridProfileButton = $("profile_button");
const cridCopyText = $("cridCopyText");
let postRegMatrixId = null;
let postRegUserName = null;
let defaultImgUrl = null;
let selectedPfpFile = null;
let useMatrixPfp = false;
let lastRandomSeed = "";
let lastRandomSeedOptions = "";
const settingsSection = $("settings_box");
const hiddenText = $("hidden_goods");
cridMatrixId.addEventListener("click", () => {
  if (cridMatrixId.value !== "Copied!") {
    cridMatrixId.focus();
    cridMatrixId.select();
    document.execCommand("copy");
    const oldtx = cridMatrixId.value;
    cridMatrixId.value = "Copied!";
    setTimeout(() => {
      cridMatrixId.value = oldtx;
    }, 2000);
  }
});
cridMatrixKey.addEventListener("click", () => {
  if (cridMatrixKey.value !== "Copied!") {
    cridMatrixKey.focus();
    cridMatrixKey.select();
    document.execCommand("copy");
    const oldtx = cridMatrixKey.value;
    cridMatrixKey.value = "Copied!";
    setTimeout(() => {
      cridMatrixKey.value = oldtx;
    }, 2000);
  }
});
// await sleep(0.4);
// loginbox.classList.add("animate_hidden");
// cridbox.classList.remove("animate_hidden");
// cridbox.classList.add("animate_shown");
// missingField("cridbox");

loginButton.onclick = () => (location.href = routes.login);
regButton.onclick = Register;
let __TimeOUT;
if (!navigator.clipboard) {
  cridCopyButton.style.display = "none";
}
cridCopyButton.onclick = async () => {
  if (navigator.clipboard) {
    try {
      cridCopyText.style.color = "inherit";
      let st = await copyToClib(
        `MATRIX-ID:${cridMatrixId.value}\nMATRIX-KEY:${cridMatrixKey.value}`
      );
      if (st) {
        cridCopyText.textContent = cridCopyText.textContent
          .replace("Copy", "Copied")
          .replace("Failed", "Copied");
        __TimeOUT ? clearTimeout(__TimeOUT) : null;
        __TimeOUT = setTimeout(() => {
          cridCopyText.textContent = cridCopyText.textContent.replace(
            "Copied",
            "Copy"
          );
        }, 10_000);
      } else {
        showErrorBoxes(
          "error_box2",
          "This setup doesn't support the clipboard",
          10000
        );
        cridCopyText.textContent = cridCopyText.textContent
          .replace("Copy", "Failed")
          .replace("Copied", "Failed");
        cridCopyText.style.color = "red";
        __TimeOUT ? clearTimeout(__TimeOUT) : null;
        __TimeOUT = setTimeout(() => {
          cridCopyText.textContent = cridCopyText.textContent.replace(
            "Failed",
            "Copy"
          );
          cridCopyText.style.color = "inherit";
        }, 2_000);
      }
    } catch (e) {}
  } else {
    //Lmao, I didn't think a fallback would work.
    //On http, which where rematrix should always work, Browsers hide the clipboard api.
    //The deprecated function for that api is using execCommand('copy') But that doesn't work on hidden items.
    //I tried to set its width and height to 0 and that didn't work, but putting it on postion:absloute, with something like right:-9999 would actually let this work.
    //But won't use this anyway, since the result of executing something with `document.execCommand` isn't reliable. Instead will copy the text when the user press the id, key fields.
    hiddenText.value = `MATRIX-ID:${cridMatrixId.value}\nMATRIX-KEY:${cridMatrixKey.value}`;
    hiddenText.focus();
    hiddenText.select();
    document.execCommand("copy");
  }
  // cridMatrixId.focus();
  // cridMatrixId.select();
  // document.execCommand("copy");

  // !st
  //   ? showErrorBoxes("error_box2", "Failed, press and hold to copy", 5000, true)
  //   : showErrorBoxes("error_box2", "Copied", 5000, true, "var(--accent-color)");
};
async function Register() {
  if (String($("username_f").value).includes(" ")) {
    missingField("username_label");
    showErrorBoxes("error_box", "Username cannot contain spaces.", 5000, true);
    return;
  }
  let usernamex = String($("username_f").value).replaceAll(" ", "");
  if (usernamex.length < 1) {
    missingField("username_label");
    return;
  }
  regText.innerText = "Wait";
  regButton.setAttribute("on_progress", "");
  loginButton.setAttribute("on_progress", "");
  try {
    if (!(await checkUserName(usernamex))) {
      let res = await fetch(`${api.url}/${api.routes.register}`, {
        method: "POST",
        headers: api.headers,
        body: JSON.stringify({
          username: usernamex,
        }),
      });
      if (res.status === 400 || res.status === 302) {
        if (res.status === 400) {
          showErrorBoxes(
            "error_box",
            "Username cannot contain symbols.",
            5000,
            true
          );
          missingField("username_label");
        } else {
          showErrorBoxes("error_box", "Username is aready taken.", 5000, true);
        }
      } else {
        let crid = await res.json();
        cridMatrixId.value = crid["matrix_id"];
        cridMatrixKey.value = crid["matrix_key"];

        postRegMatrixId = crid["matrix_id"];
        defaultImgUrl = `${api.url}/${api.routes.media}?id=p${postRegMatrixId}`;
        postRegUserName = usernamex;
        missingField("loginbox");
        // setCookie("t", crid["t"], 365);
        await sleep(0.4);
        loginbox.classList.add("animate_hidden");
        cridbox.classList.remove("animate_hidden");
        cridbox.classList.add("animate_shown");
        missingField("cridbox");
        UserState({ matrix_Id: crid["matrix_id"] });
        $("important_note").style.animation = "missing_element 0.5s 2";
      }
    } else {
      showErrorBoxes("error_box", "Username is aready taken.", 5000, true);
    }
  } catch (e) {
    showErrorBoxes("error_box", api.messages.lostcon);
  }
  regText.innerText = "Register";
  regButton.removeAttribute("on_progress");
  loginButton.removeAttribute("on_progress");
}

// post register

let conTap1 = $("control_taps_1");
let conTap2 = $("control_taps_2");
let pfp_contorls = $("pfp_contorls");
let account_controls = $("account_controls");
conTap1.onclick = () => {
  conTap2.removeAttribute("enabled");
  conTap1.setAttribute("enabled", "");
  account_controls.style.display = "none";
  pfp_contorls.style.display = "flex";
};
conTap2.onclick = () => {
  conTap1.removeAttribute("enabled");
  conTap2.setAttribute("enabled", "");
  pfp_contorls.style.display = "none";
  account_controls.style.display = "flex";
};
// ------------Profile Picture---------------
const _userNameP = $("post_register_user_name");
const _matrixIdP = $("post_register_matrix_id");

const _pfpImg = $("pfp_img");
const _imgLoader = $("img_loader");
const _pickPicture = $("gallery_pick_button");
const _seed = $("pfp_seed");
const _genButton = $("generate_button");
const _resetButton = $("reset_button");
const _goBackButton = $("go_back");
const _saveButton = $("post_save_button");
const _defaultPfpButton = $("default_pfp_button");

cridProfileButton.onclick = () => {
  settingsSection.style.display = "flex";
  _userNameP.innerText = postRegUserName;
  _matrixIdP.innerText = postRegMatrixId;
  _pfpImg.setAttribute("src", defaultImgUrl);
  _pfpImg.onerror = () => {
    _pfpImg.setAttribute("src", routes.staticAssets.internalError);
    _imgLoader.style.display = "none";
  };
  _pfpImg.onload = () => {
    _imgLoader.style.display = "none";
  };
};
const filerPicker = new FilePicker({
  accept: "image/png, image/gif, image/jpeg",
  onFileSelect: (files) => {
    onPick(files[0]);
  },
});
function onPick(file) {
  selectedPfpFile = file;
  _pfpImg.setAttribute("src", URL.createObjectURL(file));
}
_pickPicture.onclick = async () => {
  filerPicker.open();
  useMatrixPfp = false;
};
_defaultPfpButton.onclick = () => {
  _pfpImg.setAttribute("src", defaultImgUrl);
  useMatrixPfp = false;
  selectedPfpFile = null;
};
const optionsType = new buildMultiChoosesElement({
  parentElementId: "options_parent",
  elementTitle: "Type",
  chooses: ["Icon", "Combined", "Background"],
  defaultChoise: "Combined",
  onValue: "Icon",
  onValueFunc: () => {
    optionsBackgroundType.setState({ hidden: true });
  },
  onNotValueFunc: () => {
    optionsBackgroundType.setState({ hidden: false });
  },
});

const optionsBackgroundType = new buildMultiChoosesElement({
  parentElementId: "options_parent",
  elementTitle: "Background-type",
  chooses: ["Delusional", "Distorted"],
  defaultChoise: "Delusional",
});

const optionsEarlyInternet = new buildMultiChoosesElement({
  parentElementId: "options_parent",
  elementTitle: "Early internet effect",
  chooses: ["Enable", "Disable"],
  defaultChoise: "Enable",
});
const optionsCyber = new buildMultiChoosesElement({
  parentElementId: "options_parent",
  elementTitle: "CyberCore effect",
  chooses: ["Enable", "Disable"],
  defaultChoise: "Enable",
});
const optionsPixelated = new buildMultiChoosesElement({
  parentElementId: "options_parent",
  elementTitle: "Pixelation effect",
  chooses: ["Enable", "Disable"],
  defaultChoise: "Disable",
});

_genButton.onclick = async (_) => {
  // Well, the whole code is obfuscating either ways (This project was my first time writing in js, so that's that ig). But this part is extremely confusing, So let's break it down
  // The most confusing part is how I manipulated the seed input
  // Normally, it would generate a random picture if the input is empty and then assign that random seed at the input box and also the lastRandomSeed
  // So the code can know whether if the current seed inside of the seed input is a user added seed or just a generated one.
  // But what if the user liked it? then they might want to change some of it's modifers, such as the type, background type .. etc
  // But again, the current seed inside of the seed input is random. and thus it would be replaced if the user clicked "generate" again right?
  // that's where the currentOptions thingy comes in, it's a way to check whether the user changed any option after generating a random seed or not
  // and if so, then the lastRandomSeed whould become an empty string so the code would think that the user is whom added the current seed.
  // and so, it wouldn't handle it as a random seed anymore. I GUESS I JUST COMPLICATED THE WHOLE THING EVEN MORE.
  // Look at the first if block inside of this function, and look inside of this one "if (_seed.value === "" || _seed.value === lastRandomSeed)" if you're willing to edit it.
  const currentOptions = [
    optionsBackgroundType.currentChoise,
    optionsType.currentChoise,
    optionsEarlyInternet.currentChoise,
    optionsCyber.currentChoise,
    optionsPixelated.currentChoise,
  ].join(".");
  selectedPfpFile = null;
  const reImage = new ReMatrixImage();
  _genButton.setAttribute("on_progress", "");
  _imgLoader.style.display = "flex";
  if (
    _seed.value === lastRandomSeed &&
    lastRandomSeedOptions == currentOptions
  ) {
    reImage.seed = "";
  } else {
    lastRandomSeed = "";
    reImage.seed = _seed.value;
  }
  reImage.type =
    optionsType.currentChoise === "Icon"
      ? "identicon"
      : optionsType.currentChoise.toLowerCase();
  reImage.bk_type = optionsBackgroundType.currentChoise.toLowerCase();
  reImage.early_internet_effect =
    optionsEarlyInternet.currentChoise === "Enable" ? true : false;
  reImage.cyber_effect = optionsCyber.currentChoise === "Enable" ? true : false;
  reImage.early_internet_effect =
    optionsEarlyInternet.currentChoise === "Enable" ? true : false;
  await reImage.generate();
  if (reImage.current_buffer_url === null) {
    useMatrixPfp = false;
    _genButton.removeAttribute("on_progress");

    // -
    _pfpImg.setAttribute("src", defaultImgUrl);
    _genButton.setAttribute("error", "");
    _genButton.setAttribute("disabled", "");
    await sleep(3);
    _genButton.removeAttribute("error");
    _genButton.removeAttribute("disabled");
  } else {
    _pfpImg.setAttribute("src", reImage.current_buffer_url);
    _genButton.removeAttribute("on_progress");

    if (_seed.value === "" || _seed.value === lastRandomSeed) {
      lastRandomSeed = reImage.seed;
      lastRandomSeedOptions = currentOptions;
      _seed.value = reImage.seed;
    }
    useMatrixPfp = true;
  }
};
_resetButton.onclick = () => {
  useMatrixPfp = false;
  _seed.value = "";
  _pfpImg.setAttribute("src", defaultImgUrl);
  _genButton.removeAttribute("error");
  _genButton.removeAttribute("disabled");
  _genButton.removeAttribute("on_progress");
  _imgLoader.style.display = "none";
  optionsType.reset();
  optionsBackgroundType.reset();
  optionsEarlyInternet.reset();
  optionsCyber.reset();
  optionsPixelated.reset();
};
_goBackButton.onclick = () => {
  settingsSection.style.display = "none";
};

// ------------Profile Picture---------------
// ------------Profile Info------------------
let _accountIg = $("ig_username");
let _accountTg = $("tg_username");
let _accountDc = $("dc_username");

// ------------Profile Info------------------
_saveButton.onclick = async () => {
  _saveButton.setAttribute("on_progress", "");
  let st = await checkUser();
  if (st === -1) {
    connectionLost({ hideId: "homePageLayout" });
  } else if (!st[0]) {
    location.href = routes.homepage;
  } else {
    let pJson = {};
    if (selectedPfpFile) {
      const imgLoaderPrecentText = $("img_loader_precent");
      imgLoaderPrecentText.style.display = "block";
      const mediaRes = await uploadMedia({
        file: selectedPfpFile,
        is_pfp: true,
        on_loading: (p, s) => {
          if (s) {
            imgLoaderPrecentText.innerText = p;
          } else {
            imgLoaderPrecentText.innerText = "Try again.";
          }
        },
      });
      if (mediaRes === -1 || mediaRes === false) {
        _saveButton.removeAttribute("on_progress");
        return;
      } else {
        imgLoaderPrecentText.style.display = "none";
        pJson.pfp = JSON.parse(mediaRes).media_id;
      }
    } else if (useMatrixPfp) {
      pJson.use_matrix_pfp = true;
      pJson.matrix_pfp = {
        seed: _seed.value,
        type:
          optionsType.currentChoise === "Icon"
            ? "identicon"
            : optionsType.currentChoise.toLowerCase(),
        bk_type: optionsBackgroundType.currentChoise.toLowerCase(),
        pixelated_effect:
          optionsPixelated.currentChoise === "Enable" ? true : false,
        cyber_effect: optionsCyber.currentChoise === "Enable" ? true : false,
        early_internet_effect:
          optionsEarlyInternet.currentChoise === "Enable" ? true : false,
      };
    } else if (_pfpImg.getAttribute("src") === defaultImgUrl) {
      pJson.reset_pfp = true;
    }
    pJson.ig = _accountIg.value;
    pJson.tg = _accountTg.value;
    pJson.dc = _accountDc.value;
    try {
      const res00 = await fetch(`${api.url}/${api.routes.edit_profile}`, {
        method: "POST",
        headers: api.headers,
        body: JSON.stringify(pJson),
      });
      if (res00.ok) {
        window.location = `${routes.userProfile}`;
      } else {
        connectionLost({ hideId: "homePageLayout" });
      }
    } catch (e) {
      console.log(e);
      connectionLost({ hideId: "homePageLayout" });
    }
    _saveButton.removeAttribute("on_progress");
  }
};
_seed.onclick = () => {
  _seed.focus();
  _seed.select();
};
