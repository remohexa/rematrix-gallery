import {
  $,
  logout,
  UserState,
  connectionLost,
  postsLogic,
  buildImgElement,
  buildMediaElement,
  checkUser,
  mansoryViewer,
  routes,
  sleep,
} from "./root.js";

uploud_button.onclick = () => (location.href = routes.upload);
const aniList = ["uploud_button", "register_button", "login_button"];
const _footer = $("the_real_footer");
const _loader = $("index_main_loader");
//
await checkUser();
let state = UserState();
if (state) {
  // --------------------LOGIN BUTTON---------------------
  login_button.innerHTML = login_button.innerHTML.replaceAll(
    "Log-In",
    "Log-out"
  );

  login_button.setAttribute("error", "");
  login_button.onclick = async () => {
    await logout();
    window.location.reload();
  };
  // --------------------REGISTER BUTTON-------------------
  register_button.innerHTML = register_button.innerHTML.replaceAll(
    "Register",
    state["matrixId"]
  );
  register_button.onclick = () => {
    window.location.href = routes.userProfile;
  };
} else {
  login_button.onclick = () => (location.href = routes.login);
  register_button.onclick = () => (location.href = routes.register);
}
let postsInst = new postsLogic();
let _retries = 0;
const firstQRes = await postsInst.fetchposts();
if (firstQRes === null) {
  while (_retries < 10 && postsInst.posts.length === 0) {
    let s = await postsInst.fetchposts();
    if (s !== null) {
      break;
    }
    _retries++;
  }
  if (postsInst.posts.length === 0) {
    _loader.style.display = "none";
    connectionLost({ hideId: "homelayout", reload: true });
  }
} else if (postsInst.posts.length === 0) {
  const em = $("welcome-message");
  em.style.display = "flex";
  _loader.style.display = "none";
}

let dummyPosts = [
  {
    title: "A really cool title what about another line though",
    type: "image",
    src: "/assets/dummy/portiat.jpg",
    href: routes.postPage,
  },
  {
    title: "A really cool title what about another line though",
    type: "image",
    src: "/assets/dummy/8.jpeg",
    href: routes.postPage,
  },
  {
    title: "A really cool title what about another line though",
    type: "video",
    src: "/assets/media/i2.mp4",
    href: routes.postPage,
  },
  {
    title: "A really cool title what about another line though",
    type: "video",
    src: "/assets/media/i1.mp4",
    href: routes.postPage,
  },
  {
    title: "A really cool title what about another line though",
    type: "video",
    src: "/assets/media/i3.mp4",
    href: routes.postPage,
  },
  {
    title: "A really cool title what about another line though",
    type: "audio",
    src: "/assets/media/i4.mp3",
    href: routes.postPage,
  },
];
const _mediaViewer = $("mediaViewer");
const _masonryInst = new mansoryViewer(_mediaViewer, {
  minWidth: 150,
  gap: 7.5,
  max_cols: 3,
});
window.addEventListener("load", () => _masonryInst.layout());
const ro = new ResizeObserver(() => _masonryInst.layout());
ro.observe(_mediaViewer);

function viewPosts(Posts) {
  if (Posts) {
    if (Posts.length > 0) {
      _footer.style.display = "grid";
      _loader.style.display = "none";
    }
    Posts.forEach((item) => {
      if (item.type.startsWith("image")) {
        _masonryInst.append(
          buildImgElement({
            src: item.src,
            title: item.title,
            href: item.href,
            theme: item.theme,
            mansoryInst: _masonryInst,
          })
        );
      } else {
        _masonryInst.append(
          buildMediaElement({
            title: item.title,
            mediaSrc: item.src,
            href: item.href,
            type: item.type,
            theme: item.theme,
          })
        );
      }
    });
  }
}
viewPosts(postsInst.posts);
window.addEventListener("scroll", async () => {
  if (!postsInst.theEnd) {
    const currentScrollPosition = window.scrollY + window.innerHeight;
    const totalPageHeight = document.documentElement.scrollHeight - 500;
    if (currentScrollPosition >= totalPageHeight) {
      viewPosts(await postsInst.fetchposts({ init: false }));
    }
  }
});
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
