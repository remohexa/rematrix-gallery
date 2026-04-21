import {
  $,
  logout,
  postsLogic,
  buildImgElement,
  buildMediaElement,
  mansoryViewer,
  routes,
  DDB,
  toHex,
  sleep,
} from "./root.js";
import { remohexa_account } from "./remohexa.js";
uploud_button.onclick = () => (location.href = routes.upload);

const welcMessage = $("welcome-message");
const aniList = ["uploud_button", "register_button", "login_button"];
const currAccount = await DDB.get("account");
const accountState = currAccount === null;
const firstOpenState = (await DDB.get("first")) === null;
if (firstOpenState) {
  welcMessage.style.display = "flex";
  document.body.style.overflow = "hidden";
}

if (accountState && firstOpenState) {
  await DDB.set("account", {
    username: "preview-user",
    matrix_id: "0x2",
    pfp_url: `/assets/static/pfps/p0x2`,
    default_pfp: `/assets/static/pfps/p0x2`,
    ig: "",
    tg: "",
    dc: "",
  });
  location.reload();
}

if (!accountState) {
  login_button.setAttribute("error", "");
  login_button.onclick = async () => {
    const old_user = await DDB.get("account");
    await DDB.set(old_user.matrix_id, old_user);
    await DDB.delete("account");
    window.location.reload();
  };
  login_button.innerHTML = login_button.innerHTML.replaceAll(
    "Log-In",
    "Log-out"
  );

  register_button.innerHTML = register_button.innerHTML.replaceAll(
    "Register",
    currAccount.matrix_id
  );
  register_button.onclick = () => {
    window.location.href = routes.userProfile;
  };
} else {
  login_button.onclick = () => (location.href = routes.login);
  register_button.onclick = () => (location.href = routes.register);
}
$("alrighty_button").onclick = async () => {
  await DDB.set("first", false);
  location.reload();
};
let posts = [];
const postsCount = await DDB.get("lastpostid");
for (let i = 0; i != postsCount + 10; i++) {
  const postId = `p${toHex(i)}`;
  const post = await DDB.get(postId);
  if (post) {
    if (post.deleted !== true) {
      post["post_id"] = postId;
      posts.push(post);
    }
  }
}
const _mediaViewer = $("mediaViewer");
const _masonryInst = new mansoryViewer(_mediaViewer, {
  minWidth: 150,
  gap: 7.5,
  max_cols: 4,
});
window.addEventListener("load", () => _masonryInst.layout());
const ro = new ResizeObserver(() => _masonryInst.layout());
ro.observe(_mediaViewer);
const _footer = $("the_real_footer");
const _loader = $("index_main_loader");
async function viewPosts(Posts) {
  if (Posts) {
    if (Posts.length > 0) {
      _footer.style.display = "grid";
      _loader.style.display = "none";
    }

    for (const item of Posts) {
      if (item.type.startsWith("image")) {
        let imageURL;
        if (item.media_id.startsWith("m0x")) {
          imageURL = await DDB.getFileBlobURL(item.media_id);
        } else {
          imageURL = item.media_id;
        }

        _masonryInst.append(
          buildImgElement({
            src: imageURL,
            title: item.title,
            href: `${routes.postPage}?id=${item.post_id}`,
            theme: item.theme,
            mansoryInst: _masonryInst,
          })
        );
      } else {
        let mediaURL;
        if (item.media_id.startsWith("m0x")) {
          mediaURL = await DDB.getFileBlobURL(item.media_id);
        } else {
          mediaURL = item.media_id;
        }

        _masonryInst.append(
          buildMediaElement({
            title: item.title,
            mediaSrc: mediaURL,
            href: `${routes.postPage}?id=${item.post_id}`,
            type: item.type,
            theme: item.theme,
          })
        );
      }
    }
  }
}

const postsS = [...posts, ...remohexa_account.posts];
await viewPosts(postsS);

window.addEventListener("message", (e) => {
  if (e.data?.type !== "IFRAME_RESIZE") return;

  const iframe = document.querySelectorAll(`iframe[data-id="${e.data.file}"]`);
  iframe.forEach((i) => {
    i.style.height = `${e.data.height}px`;
  });
  iframe.contentWindow?.postMessage({ type: "PING" }, "*");
  _masonryInst.layout();
});

await sleep(1);
for (let I of aniList) {
  const el = $(I);
  el.innerHTML = el.innerHTML.replaceAll("animated_text", "placeholderr");
  void el.offsetWidth;
  el.innerHTML = el.innerHTML.replaceAll("placeholderr", "animated_text");
}
