import {
  $,
  $c,
  routes,
  getFileHash,
  FilePicker,
  DDB,
  toHex,
  sleep,
  bytesToHuman,
} from "../root.js";

import { showErrorBoxes } from "../styles.js";
const __currUser = await DDB.get("account");
if (!__currUser) {
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
  const LIST = await DDB.get("mediaHashList");
  if (LIST) {
    if (LIST.includes(file_sha256)) {
      showErrorBoxes(
        "error_box",
        "This file has already been posted.",
        5000,
        true,
        "",
        true
      );
      mediaLoader.style.display = "none";
      return;
    }
  }
  file_URL = URL.createObjectURL(file);
  media_metadata = {
    ogname: file.name,
    mediatype: file.type,
    lastmodified: file.lastModified,
    size: file.size,
  };
  media_file = file;
  ViewTheMedia();
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
const { quota, usage } = await navigator.storage.estimate();
async function post() {
  updateProgressButton(0, true);
  $("Delete").style.display = "none";
  infoTitle.setAttribute("disabled", "");
  infoDescription.setAttribute("disabled", "");
  const mediaId = await DDB.getNewMediaId();
  await DDB.saveFile(mediaId, await media_file);
  const curr_user = await DDB.get("account");
  const postId = await DDB.getNewPostId();
  for (let i = 0; i < 100; i++) {
    if (Math.random() > Math.random()) {
      await sleep(0.01);
    }
    await sleep(0.03);
    updateProgressButton(`${`${i + Math.random()}`.slice(0, 4)}%`, true);
  }
  const date = new Date();
  let metadata = {
    post_id: postId,
    owner_id: curr_user.matrix_id,
    date: date.toDateString(),
    media: {
      id: mediaId,
      owner_id: curr_user.matrix_id,
      original_name: media_metadata.ogname,
      upload_date: date.toDateString(),
      size: bytesToHuman(media_metadata.size),
      mime: media_metadata.mediatype,
      sha256: file_sha256,
    },
  };
  await DDB.set(postId, {
    title: infoTitle.value,
    desc: infoDescription.value,
    media_id: mediaId,
    hash: file_sha256,
    type: media_metadata.mediatype,
    matrix_id: curr_user.matrix_id,
    metadata: metadata,
  });
  let oldHashes = await DDB.get("mediaHashList");

  if (oldHashes !== null) {
    oldHashes.push(file_sha256);
    await DDB.set("mediaHashList", oldHashes);
  } else {
    await DDB.set("mediaHashList", [file_sha256]);
  }
  window.location.href = `${routes.postPage}?id=${postId}`;
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
