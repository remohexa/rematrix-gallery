// Copyright (C) 2026 remohexa
// SPDX-License-Identifier: GPL-3.0
// Github: https://github.com/remohexa/rematrix-gallery
import {
  $,
  $c,
  api,
  checkUser,
  routes,
  getFileHash,
  FilePicker,
  connectionLost,
  uploadMedia,
} from "../root.js";

import { showErrorBoxes } from "../styles.js";

let st = await checkUser();

if (st === -1) {
  connectionLost({ hideId: "uploadLayout" });
} else if (!st[0]) {
  location.href = routes.register;
}

const addMediaButton = $("addmedia");
const progressButton = $("progress_button");
const progressText = $("progress_text");
const media_box = $("media_box");
const mediaLoader = $("temploader");
const postButton = $("post_button");
const infoForm = $("form");
const infoTitle = $("title");
const infoDescription = $("description");

let picker = new FilePicker({
  onFileSelect: (files) => {
    onPickedFile(files[0]);
  },
});

let media_metadata = {
  ogname: "",
  mediatype: "",
  lastmodified: 0,
  size: 0,
};
let file_URL;
let media_file;
let file_sha256;

addMediaButton.onclick = (_) => {
  picker.open();
};
$("Delete").onclick = (_) => {
  ResetMediaSelection();
};
infoForm.addEventListener("input", function (__) {
  if (infoTitle.value.replaceAll(" ", "") !== "") {
    postButton.removeAttribute("disabled", "");
  } else {
    postButton.setAttribute("disabled", "");
  }
});
async function onPickedFile(file) {
  mediaLoader.style.display = "flex";
  file_sha256 = await getFileHash(file);
  let hres = await queryMediaHash(file_sha256);
  let succ = true;
  if (hres === 302) {
    showErrorBoxes(
      "error_box",
      "This file has already been posted.",
      5000,
      true,
      "",
      true
    );
    succ = false;
  } else if (hres === -1) {
    showErrorBoxes("error_box", "Check your connection.", 5000, true, "", true);
    succ = false;
  } 
  if (succ) {
    file_URL = URL.createObjectURL(file);
    media_metadata = {
      ogname: file.name,
      mediatype: file.type,
      lastmodified: file.lastModified,
      size: file.size,
    };
    media_file = file;
    ViewTheMedia();
  }
  mediaLoader.style.display = "none";
}
function ViewTheMedia() {
  let createdElement;
  let cr = false;
  if (file_URL != "" && media_metadata.mediatype != "") {
    if (media_metadata.mediatype.startsWith("image")) {
      createdElement = $c("img");
      createdElement.setAttribute("src", `${file_URL}`);
      cr = true;
    } else if (
      media_metadata.mediatype.startsWith("video") ||
      media_metadata.mediatype.startsWith("audio")
    ) {
      createdElement = $c("iframe");
      createdElement.setAttribute(
        "src",
        `/js/elements/media_player/player.html?file=${file_URL}`
      );
      cr = true;
    }
    if (cr) {
      $("Delete").style.display = "block";
      addMediaButton.style.display = "none";
      media_box.appendChild(createdElement);
      media_box.style.display = "block";
    } else {
      showErrorBoxes(
        "error_box",
        "Select a valid media file!",
        5000,
        true,
        "",
        true
      );
      return;
    }
  }
}
function ResetMediaSelection() {
  $("Delete").style.display = "none";
  media_file = media_metadata = file_URL = file_sha256 = null;
  media_box.innerHTML = "";
  addMediaButton.style.display = "flex";
  media_box.style.display = "none";
}

postButton.onclick = async (_) => {
  await post();
};
async function post() {
  let state = await checkUser();
  if (!state[0]) {
    location.href = routes.login;
  } else {
    $("Delete").style.display = "none";
    infoTitle.setAttribute("disabled", "");
    infoDescription.setAttribute("disabled", "");
    const media_res = await uploadMedia({
      file: media_file,
      on_loading: updateProgressButton,
    });
    if (media_res === -1 || media_res.code === 422 || media_res.code === 413) {
      showErrorBoxes(
        "error_box",
        media_res === -1
          ? "This file has already been posted."
          : media_res.code === 422
          ? "Please upload a valid file, with one of the allowed formats."
          : media_res.res,
        7500,
        true,
        "",
        true
      );
      progressButton.removeAttribute("on_progress", "");
      progressButton.setAttribute("error", "");
      addMediaButton.setAttribute("error", "");
      addMediaButton.setAttribute("disabled", "");
      progressText.innerText = "Reload";
      progressButton.onclick = (_) => {
        window.location.reload();
      };
    } else if (media_res === false) {
    } else {
      const media_id = JSON.parse(media_res).media_id;
      const res = await postRequest(
        infoTitle.value,
        infoDescription.value,
        media_id
      );
      if (res === false) {
        progressButton.removeAttribute("on_progress", "");
        progressButton.setAttribute("error", "");
        addMediaButton.setAttribute("error", "");
        addMediaButton.setAttribute("disabled", "");
        progressText.innerText = "Retry";
        progressButton.onclick = async (_) => {
          await post();
        };
      } else {
        if (res.new) {
          window.location.href = `${routes.postPage}?id=${res.post_id}`;
        } else {
          progressButton.removeAttribute("on_progress", "");
          progressButton.setAttribute("error", "");
          addMediaButton.setAttribute("disabled", "");
          progressText.style.fontSize = "16px";
          progressText.innerText = `Old post -> ${res.post_id}`;
          progressButton.onclick = async (_) => {
            window.location.href = `${routes.postPage}?id=${res.post_id}`;
          };
        }
      }
    }
  }
}
function updateProgressButton(percent, state) {
  postButton.setAttribute("hidden", "");
  progressButton.onclick = null;
  progressButton.removeAttribute("hidden");
  progressButton.removeAttribute("on_progress");
  if (state) {
    progressButton.setAttribute("on_progress", "");
    progressText.innerText = percent;
  } else {
    progressButton.setAttribute("error", "");
    progressText.innerText = "Retry";
    progressButton.onclick = async () => {
      await post();
    };
  }
}

async function queryMediaHash(hash) {
  // 302 => Uploaded (AND) another user OR has been already posted
  // 200 => Free to use
  // matrix_id => Uploaded && owner_id == current user_id && Not posted
  try {
    let res = await fetch(
      `${api.url}/${api.routes.queryMediaHash}?hash=${hash}`,
      {
        method: "GET",
        headers: api.headers,
      }
    );
    let resText = await res.text();
    if (resText.startsWith("m")) {
      return resText;
    }
    return res.status;
  } catch {
    return -1;
  }
}

async function postRequest(title, desc, media_id) {
  try {
    let res = await fetch(`${api.url}/${api.routes.new_post}`, {
      method: "POST",
      headers: api.headers,
      body: JSON.stringify({ title: title, desc: desc, media_id: media_id }),
    });
    if (res.ok) {
      return await res.json();
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
}
