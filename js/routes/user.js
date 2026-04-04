import { remohexa_account } from "../remohexa.js";
import {
  $,
  routes,
  sleep,
  ReMatrixImage,
  buildMultiChoosesElement,
  FilePicker,
  mansoryViewer,
  buildImgElement,
  buildMediaElement,
  DDB,
  fromHex,
  toHex,
} from "../root.js";
let defaultImgUrl = null;
let selectedPfpFile = null;
let currentPfp = null;
let currentPfpUrl = null;
let useMatrixPfp = false;
let lastRandomSeed = "";
let lastRandomSeedOptions = "";
// let conTap1 = $("control_taps_1");
let conTap2 = $("control_taps_2");
let conTap3 = $("control_taps_3");
let user_posts = $("user_posts");
let pfp_contorls = $("pfp_contorls");
let account_controls = $("account_controls");
const hiddenText = $("hidden_goods");
function postsState(hide = true) {
  if (hide) {
    user_posts.style.display = "none";
    conTap3.removeAttribute("enabled");
    conTap2.setAttribute("enabled", "");
    account_controls.style.display = "none";
    pfp_contorls.style.display = "flex";
  } else {
    user_posts.style.display = "block";
    conTap3.removeAttribute("enabled");
    conTap2.removeAttribute("enabled");
    account_controls.style.display = "none";
    pfp_contorls.style.display = "none";
  }
}
conTap2.onclick = () => {
  conTap3.removeAttribute("enabled");
  conTap2.setAttribute("enabled", "");
  pfp_contorls.style.display = "flex";
  account_controls.style.display = "none";
};
conTap3.onclick = () => {
  conTap2.removeAttribute("enabled");
  conTap3.setAttribute("enabled", "");
  account_controls.style.display = "flex";
  pfp_contorls.style.display = "none";
};
const _taps_container = $("inner_profile_contorls_id");
const _editButton = $("edit_profile");
const _editButtonText = $("edit_button_text");
const _imgElement = $("pfp_img");
const _userNameText = $("post_register_user_name");
const _matrixIdText = $("post_register_matrix_id");
const _igInput = $("ig_username");
const _dcInput = $("dc_username");
const _tgInput = $("tg_username");
const _socialsContainer = $("user_socials_inner");
const _igIcon = $("ig_icon");
const _dcIcon = $("dc_icon");
const _tgIcon = $("tg_icon");
const _igLink = $("ig_link");
const _tgLink = $("tg_link");
const _SaveContainer = $("control_save");
const params = new URLSearchParams(location.search);
const __currUser = await DDB.get("account", true);
let matrix_id = params.get("id");
let userInst;
if (matrix_id === "0x1") {
  userInst = remohexa_account;
  userInst.userPosts = remohexa_account.posts;
} else {
  matrix_id === __currUser.matrix_id ? (matrix_id = "account") : null;
  !matrix_id ? (matrix_id = "account") : null;

  userInst = await DDB.get(matrix_id);
}
if (matrix_id === null) {
  if (!__currUser) {
    location.href = routes.homepage;
  }
} else {
  if (matrix_id !== __currUser.matrix_id && !userInst) {
    location.href = `${routes[404]}?u=1`;
  }
}

currentPfp = userInst.pfp_url;
currentPfpUrl = `${userInst.pfp_url}`;
defaultImgUrl = `${userInst.default_pfp}`;
const socialsList = [];
userInst.dc !== "" ? socialsList.push({ type: "dc", data: userInst.dc }) : null;
userInst.ig !== "" ? socialsList.push({ type: "ig", data: userInst.ig }) : null;
userInst.tg !== "" ? socialsList.push({ type: "tg", data: userInst.tg }) : null;
if (socialsList.length > 0) {
  _socialsContainer.style.display = "flex";
  _socialsContainer.setAttribute("enabled", "true");
  for (var i of socialsList) {
    if (i.type === "ig") {
      _igIcon.style.display = "inline-block";
      _igLink.setAttribute("href", userInst.ig);
    } else if (i.type === "dc") {
      _dcIcon.style.display = "inline-block";
      _dcIcon.onclick = async () => {
        const _dcSvg = $("dc_link");
        if (_dcSvg.getAttribute("copied") !== "true") {
          _dcSvg.setAttribute("copied", "true");
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(userInst.dc);
          } else {
            hiddenText.value = userInst.dc;
            hiddenText.focus();
            hiddenText.select();
            document.execCommand("copy");
          }
          setTimeout(() => {
            _dcSvg.removeAttribute("copied");
          }, 3000);
        }
      };
    } else if (i.type === "tg") {
      _tgIcon.style.display = "inline-block";
      _tgLink.setAttribute("href", userInst.tg);
    }
  }
}
if (userInst.matrix_id === __currUser.matrix_id) {
  _editButton.style.display = "block";
  _editButton.onclick = () => {
    if (_editButtonText.innerText == "Edit") {
      _SaveContainer.style.display = "flex";
      _editButton.setAttribute("error", "");
      _editButtonText.innerText = "Exit";
      _socialsContainer.style.display = "none";
      _taps_container.style.display = "flex";
      postsState();
    } else {
      postsState(false);
      _SaveContainer.style.display = "none";
      _editButton.removeAttribute("error");
      _editButtonText.innerText = "Edit";
      _resetButton.click();
      _igInput.value = userInst.ig;
      _tgInput.value = userInst.tg;
      _dcInput.value = userInst.dc;
      if (_socialsContainer.getAttribute("enabled")) {
        _socialsContainer.style.display = "flex";
      }

      _taps_container.style.display = "none";
    }
  };
}
if (`${currentPfpUrl}`.startsWith("m0x")) {
  currentPfpUrl = await DDB.getFileBlobURL(currentPfpUrl);
}
_imgElement.setAttribute("src", currentPfpUrl);
_userNameText.innerText = userInst.username;
_matrixIdText.innerText = userInst.matrix_id;
_igInput.value = userInst.ig;
_tgInput.value = userInst.tg;
_dcInput.value = userInst.dc;

// Profile editing logic
const _pfpImg = $("pfp_img");
_pfpImg.onerror = () => {
  _pfpImg.setAttribute("src", routes.staticAssets.notFound);
  _imgLoader.style.display = "none";
};
_pfpImg.onload = () => {
  _imgLoader.style.display = "none";
};
const _imgLoader = $("img_loader");
const _pickPicture = $("gallery_pick_button");
const _seed = $("pfp_seed");
const _genButton = $("generate_button");
const _resetButton = $("reset_button");
const _defaultPfpButton = $("default_pfp_button");
const _saveButton = $("post_save_button");
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

_genButton.onclick = async (_) => {
  // Look inside register.js, you'll find the exact same function.
  // I explained how I manipulated the seed input there.
  const currentOptions = [
    optionsBackgroundType.currentChoise,
    optionsType.currentChoise,
    optionsEarlyInternet.currentChoise,
    optionsCyber.currentChoise,
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
  selectedPfpFile = null;
  _pfpImg.setAttribute("src", currentPfpUrl);
  _genButton.removeAttribute("error");
  _genButton.removeAttribute("disabled");
  _genButton.removeAttribute("on_progress");
  _imgLoader.style.display = "none";
  optionsType.reset();
  optionsBackgroundType.reset();
  optionsEarlyInternet.reset();
  optionsCyber.reset();
};

_saveButton.onclick = async () => {
  _saveButton.setAttribute("on_progress", "");

  let pJson = {};
  let oldAccount = await DDB.get("account");
  if (selectedPfpFile) {
    const imgLoaderPrecentText = $("img_loader_precent");
    imgLoaderPrecentText.style.display = "block";
    const newMediaId = await DDB.getNewMediaId();
    await DDB.saveFile(newMediaId, selectedPfpFile);
    oldAccount["pfp_url"] = newMediaId;
  } else if (useMatrixPfp) {
    oldAccount["pfp_url"] = _pfpImg.getAttribute("src");
  } else if (_pfpImg.getAttribute("src") === defaultImgUrl) {
    oldAccount["pfp_url"] = defaultImgUrl;
  }

  const ig = `${_igInput.value}`;
  const tg = `${_tgInput.value}`;
  oldAccount.ig = ig.includes("http")
    ? ig
    : ig.replace(" ", "") !== ""
    ? `https://www.instagram.com/${ig.replace("@", "").replace(" ", "")}`
    : "";

  oldAccount.tg = tg.includes("http")
    ? tg
    : tg.replace(" ", "") !== ""
    ? `https://t.me/${tg.replace("@", "").replace(" ", "")}`
    : "";

  oldAccount.dc = _dcInput.value;
  await DDB.delete("account");
  await DDB.set("account", oldAccount);
  window.location = `${routes.userProfile}`;
  _saveButton.removeAttribute("on_progress");
};

_seed.onclick = () => {
  _seed.focus();
  _seed.select();
};
const _mediaViewer = $("mediaViewer");
const _postsPlaceHolder = $("mediaViewer_place_holder");
const _masonryInst = new mansoryViewer(_mediaViewer, {
  minWidth: 150,
  gap: 7.5,
  max_cols: 3,
});
window.addEventListener("load", () => _masonryInst.layout());
const ro = new ResizeObserver(() => _masonryInst.layout());
ro.observe(_mediaViewer);

async function viewPosts(Posts) {
  userInst.userPosts.length === 0
    ? (_postsPlaceHolder.style.display = "flex")
    : null;
  Posts.forEach(async (item) => {
    let URL;

    if (item.media_id.startsWith("m0x")) {
      URL = await DDB.getFileBlobURL(item.media_id);
    } else {
      URL = item.media_id;
    }

    if (item.type.startsWith("image")) {
      _masonryInst.append(
        buildImgElement({
          src: URL,
          title: item.title,
          href: `${routes.postPage}?id=${item.post_id}`,
          theme: item.theme,
          mansoryInst: _masonryInst,
        })
      );
    } else {
      _masonryInst.append(
        buildMediaElement({
          title: item.title,
          mediaSrc: URL,
          href: `${routes.postPage}?id=${item.post_id}`,
          type: item.type,
          theme: item.theme,
        })
      );
    }
  });
}
const postsCount = (await DDB.get("lastpostid")) || 1;
if (postsCount && matrix_id !== "0x1") {
  userInst.userPosts = [];
  for (let i = 0; i != fromHex(`${postsCount}`.replace("p0x", "")) + 1; i++) {
    const post_id = `p${toHex(i)}`;
    const post = await DDB.get(post_id);

    if (post) {
      if (post.matrix_id === userInst.matrix_id && post.deleted !== true) {
        post["post_id"] = post_id;
        userInst.userPosts.push(post);
      }
    }
  }
}

viewPosts(userInst.userPosts);

window.addEventListener("message", (e) => {
  if (e.data?.type !== "IFRAME_RESIZE") return;

  const iframe = document.querySelectorAll(`iframe[data-id="${e.data.file}"]`);
  iframe.forEach((i) => {
    i.style.height = `${e.data.height}px`;
  });
  iframe.contentWindow?.postMessage({ type: "PING" }, "*");
  _masonryInst.layout();
});
