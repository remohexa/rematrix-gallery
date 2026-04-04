import { $, routes, fetchPost, checkImg, DDB, randomQoutes } from "../root.js";
import { remohexa_account } from "../remohexa.js";
const loader = $("temploader");
const params = new URLSearchParams(location.search);
const postId = params.get("id");
const deleteButton = $("Delete");
const deleteButtonText = $("Delete_text");
//-
const postMediaContainer = $("media_container");
const postTitle = $("title");
const postDisc = $("disc");
const userUserNameId = $("matrix_id");
const userPfp = $("pfp_picture");
const userTgLink = $("tg_link");
const userDcLink = $("dc_link");
const userIgLink = $("ig_link");
const _metaDataBlock = $("meta_data_block");
const _metaDataButton = $("meta_data_button");
const _downloadButton = $("download_media_button");
const hiddenText = $("hidden_goods");
//-
let post;
// throw new Error();
if (remohexa_account.posts_ids.includes(postId)) {
  for (const ite of remohexa_account.posts) {
    if (ite.post_id === postId) {
      post = ite;
      break;
    }
  }
} else {
  post = await DDB.get(postId);
}

let postStatus = null;
if (post === null) {
  postStatus = 404;
} else if (post.deleted === true) {
  postStatus = -1;
}
if (postStatus) {
  postMediaContainer.appendChild(
    postBuildMediaElement({
      url:
        postStatus === 404
          ? `${routes.staticAssets.notFound}`
          : `${routes.staticAssets.deleted}`,
      type: "image",
    })
  );
  postTitle.innerText =
    postStatus === 404 ? "(404)" : "This post has been removed.";
  postDisc.innerText =
    postStatus === 404
      ? "NOT FOUND"
      : randomQoutes[Math.floor(Math.random() * randomQoutes.length)];
  userUserNameId.innerText = "Unknown";
  userUserNameId.setAttribute("matrix_id", "0x0");
  $("socials_container").style.display = "none";
  _metaDataButton.style.display = "none";
  _downloadButton.style.display = "none";
  userPfp.style.backgroundImage = `url('${routes.staticAssets.notFound}')`;
} else {
  let current_user = await DDB.get("account", true);
  post.owner =
    post.matrix_id === "0x1"
      ? remohexa_account
      : post.matrix_id === current_user.matrix_id
      ? current_user
      : await DDB.get(post.matrix_id);
  const BlobURL = post.media_id.startsWith("m0x")
    ? await DDB.getFileBlobURL(post.media_id)
    : post.media_id;
  postTitle.innerText = post.title; //;
  postDisc.innerText = post.desc;
  userUserNameId.innerText = post.owner.username;
  userUserNameId.setAttribute("matrix_id", post.matrix_id);
  if (`${post.owner.pfp_url}`.startsWith("m0x")) {
    post.owner.pfp_url = await DDB.getFileBlobURL(post.owner.pfp_url);
  }
  userPfp.style.backgroundImage = `url('${post.owner.pfp_url}')`;
  checkImg({
    src: post.owner.pfp_url,
    onload: () => {
      userPfp.style.backgroundImage = `url('${post.owner.pfp_url}')`;
    },
    onerror: () => {
      userPfp.style.backgroundImage = `url('${routes.staticAssets.internalError}')`;
    },
  });

  const dic = [
    { element: userTgLink, value: post.owner.tg },
    { element: userDcLink, value: post.owner.dc },
    { element: userIgLink, value: post.owner.ig },
  ];
  dic.forEach((e) => {
    if (e.value === "" || e.value === null || e.value === undefined) {
      e.element.style.display = "none";
    } else {
      e.element.setAttribute("href", e.value);
    }
  });
  userDcLink.onclick = async () => {
    if (userDcLink.getAttribute("copied") !== "true") {
      userDcLink.setAttribute("copied", "true");
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(post.owner.dc);
      } else {
        hiddenText.value = post.owner.dc;
        hiddenText.focus();
        hiddenText.select();
        document.execCommand("copy");
      }
      setTimeout(() => {
        userDcLink.removeAttribute("copied");
      }, 3000);
    }
  };
  userPfp.onclick = () => {
    window.location.href = `${routes.userProfile}?id=${post.matrix_id}`;
  };
  userUserNameId.onclick = () => {
    window.location.href = `${routes.userProfile}?id=${post.matrix_id}`;
  };
  postMediaContainer.appendChild(
    postBuildMediaElement({
      url: `${BlobURL}`,
      type: post.type,
    })
  );
  if (post.metadata) {
    _metaDataBlock.value = JSON.stringify(post.metadata, null, 2);
    _metaDataBlock.style.height = `${_metaDataBlock.scrollHeight}px`;
    _metaDataBlock.style.display = "none";
    _metaDataButton.onclick = () => {
      if (_metaDataButton.getAttribute("on_progress") === "") {
        _metaDataButton.setAttribute("accent", "");
        _metaDataButton.removeAttribute("on_progress");
        _metaDataBlock.style.display = "none";
      } else {
        _metaDataButton.removeAttribute("accent");
        _metaDataButton.setAttribute("on_progress", "");
        _metaDataButton.style.pointerEvents = "all";
        _metaDataBlock.style.display = "inline-block";
      }
    };
  } else {
    _metaDataButton.style.display = "none";
  }
  if (post.down_url) {
    _downloadButton.setAttribute("href", `${post.down_url}`);
    _downloadButton.setAttribute("target", "_blank");
  } else {
    _downloadButton.setAttribute("href", `${BlobURL}`);
    _downloadButton.setAttribute("download", `${postId}`);
  }

  if (current_user) {
    if (current_user.matrix_id === post.owner.matrix_id) {
      deleteButton.style.display = "block";

      deleteButton.onclick = async () => {
        if (deleteButton.getAttribute("on_progress") === "true") {
          await DDB.deleteFile(post.media_id);
          let oldPost = await DDB.get(postId);
          oldPost.deleted = true;
          await DDB.delete(postId);
          await DDB.set(postId, oldPost);
          window.location.reload();
        } else {
          deleteButton.removeAttribute("error");
          deleteButton.setAttribute("on_progress", "true");
          deleteButton.style.pointerEvents = "all";
          setTimeout(() => {
            deleteButton.removeAttribute("on_progress");
            deleteButton.setAttribute("error", "");
          }, 5000);
        }
      };
    }
  }
}

postDisc.innerText != "" ? (postDisc.style.display = "block") : null;
loader.style.display = "none";

window.addEventListener("message", (e) => {
  if (e.data?.type !== "IFRAME_RESIZE") return;
  const iframe = document.querySelectorAll(`iframe[data-id="${e.data.file}"]`);
  iframe.forEach((i) => {
    i.style.height = e.data.height + "px";
  });
  iframe.contentWindow?.postMessage({ type: "PING" }, "*");
});
function postBuildMediaElement({ url = "", type = "" } = {}) {
  if (type.startsWith("image")) {
    let img = document.createElement("img");
    img.classList.add("homepage_img");
    img.setAttribute("src", url);
    img.setAttribute("alt", routes.staticAssets.internalError);
    return img;
  } else {
    let ifr = document.createElement("iframe");
    ifr.setAttribute(
      "src",
      `/js/elements/media_player/player.html?file=${url}&view=true&type=${type}`
    );
    ifr.setAttribute("data-id", url);
    if (type.startsWith("audio")) {
      ifr.style.height = "35vh";
    }
    return ifr;
  }
}
