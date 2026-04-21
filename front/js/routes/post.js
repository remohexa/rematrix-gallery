// Copyright (C) 2026 remohexa
// SPDX-License-Identifier: GPL-3.0
// Github: https://github.com/remohexa/rematrix-gallery
import {
  api,
  $,
  checkUser,
  routes,
  fetchPost,
  connectionLost,
  checkImg,
  randomQoutes,
} from "../root.js";

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

try {
  // throw new Error();
  const st = await checkUser();
  const post = await fetchPost(postId);
  if (post === 404 || post.matrix_id === "0x0") {
    postMediaContainer.appendChild(
      postBuildMediaElement({
        url:
          post === 404
            ? `${routes.staticAssets.notFound}`
            : `${routes.staticAssets.deleted}`,
        type: "image",
      })
    );
    postTitle.innerText =
      post === 404 ? "(404)" : "This post has been removed.";
    postDisc.innerText =
      post === 404
        ? "NOT FOUND"
        : randomQoutes[Math.floor(Math.random() * randomQoutes.length)];
    userUserNameId.innerText = "Unknown";
    userUserNameId.setAttribute("matrix_id", "0x0");
    $("socials_container").style.display = "none";
    _metaDataButton.style.display = "none";
    _downloadButton.style.display = "none";
    userPfp.style.backgroundImage = `url('${routes.staticAssets.notFound}')`;
  } else if (post === 404) {
  } else if (post === -1) {
    connectionLost({ hideId: "post_layout", reload: true });
  } else {
    postTitle.innerText = post.title; //;
    postDisc.innerText = post.disc;
    userUserNameId.innerText = post.owner.username;
    userUserNameId.setAttribute("matrix_id", post.owner.matrix_id);
    userPfp.style.backgroundImage = `url('${api.url}/${api.routes.media}?id=${post.owner.pfp}')`;
    checkImg({
      src: `${api.url}/${api.routes.media}?id=${post.owner.pfp}`,
      onload: () => {
        userPfp.style.backgroundImage = `url('${api.url}/${api.routes.media}?id=${post.owner.pfp}')`;
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
          await navigator.clipboard.writeText(userInst.dc);
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
        url: `${api.url}/${api.routes.media}?id=${post.media_id}`,
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
    _downloadButton.setAttribute(
      "href",
      `${api.url}/${api.routes.media}?id=${post.media_id}&full_res=true`
    );
    _downloadButton.setAttribute("download", `${post.post_id}`);

    if (st !== -1) {
      if (st[0]) {
        if (st[1] === post.owner.matrix_id) {
          deleteButton.style.display = "block";

          deleteButton.onclick = async () => {
            if (deleteButton.getAttribute("on_progress") === "true") {
              const delRes = await fetchPost(postId, true);
              if (delRes === 200) {
                window.location.reload();
              } else {
                connectionLost({ hideId: "post_layout", reload: true });
              }
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
  }
  postDisc.innerText != "" ? (postDisc.style.display = "block") : null;
  loader.style.display = "none";
} catch (e) {
  connectionLost({ hideId: "post_layout" });
}

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
