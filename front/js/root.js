import { getFFileHash } from "./elements/js-sha256.js";
import { IndexedDB } from "./indexedDB.js";
const apiUrl = `${location.origin}/a`;

export const $ = (id) => document.getElementById(id);
export const $c = (element_name) => document.createElement(element_name);
export const DDBB = new IndexedDB();
// Note on wide screens
const wstatus = await DDBB.get("widescreen");
if (window.innerWidth > 600 && !wstatus) {
  const htm = `
  <div class="width_error">
  <div>
  <p>Unfortunately, wide screens are not currently supported.</p>
  <p>For the best experience, use Chrome-based browsers on a smartphone, or open your browser’s developer tools and enable mobile view.</p>
  <div class="buttons">
  <a href="https://github.com/remohexa/rematrix-gallery" target="_blank" style="width:100%;">
   <button
      class="rematrix_corners corners_button rematrix_button"
    >
      <div>
        <span class="animated_text">Fine, I'll make a PR myself</span>
      </div>
    </button>
    </a>
     <button
      id="wideScreenButton"
      class="rematrix_corners corners_button rematrix_button" 
    >
      <div>
        <span class="animated_text">I want to see it anyway</span>
      </div>
    </button>
  </div>
  </div>
  </div>
  `;
  const ccc = document.createElement("div");
  ccc.innerHTML = htm;
  document.body.appendChild(ccc);
  $("wideScreenButton").onclick = async () => {
    await DDBB.set("widescreen", true);
    window.location.reload();
  };
}
export let api = {
  url: apiUrl,
  headers: { "content-type": "application/json" },
  redirects: {
    apifrom: "where to",
    index: "/",
  },
  routes: {
    // USER
    login: "login",
    register: "register",
    logout: "logout",
    user: "user",
    edit_profile: "edit_profile", //POST
    // MEDIA
    media_upload: "media_upload",
    media: "media",
    new_post: "post", // POST
    posts: "posts",
    post: "post", // GET
    // MISC
    gen_rematrix_picture: "gen_rematrix_picture", // GET
    queryMediaHash: "media_hash_query",
    check_connection: "check_connection", // GET
  },
  messages: {
    lostcon: "Signal lost. Check your internet & try again.",
  },
};

export let routes = {
  homepage: "/",
  postPage: "/post",
  login: "/login",
  register: "/register",
  upload: "/upload",
  userProfile: "/user",
  404: "/404",
  staticAssets: {
    notFound: "/assets/static/404.jpg",
    deleted: "/assets/static/deleted.jpg",
    internalError: "/assets/static/500.jpg",
  },
};
export const randomQoutes = [
  "However, did you know that the matrix id 0x0 is reserved for the server?",
];
export function sleep(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}
export async function copyToClib(tx) {
  try {
    await navigator.clipboard.writeText(tx);
    return true;
  } catch (err) {
    return false;
  }
}

export function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  document.cookie = `${cname}=${cvalue}; expires=${d.toUTCString()}; path=/`;
}

export function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
export async function logout(forward = true) {
  let head = api.headers;
  let res = await fetch(`${api.url}/${api.routes.logout}`, {
    method: "GET",
    headers: head,
  });
  if (res.status === 200) {
    UserState({ logout: true });
    if (forward) {
      window.location.href = "/";
    }
  }
}
export async function checkUser(home = false) {
  let res;
  let head = api.headers;
  head["check"] = "true";
  try {
    res = await fetch(`${api.url}/${api.routes.user}`, {
      method: "POST",
      headers: head,
    });
  } catch (e) {
    return -1;
  }
  if (res.status === 200) {
    if (home) {
      window.location.href = "/";
      return;
    }
    let js = await res.json();

    return [true, js["matrix_id"]];
  } else if (res.status === 401) {
    await logout(false);
    return [false];
  } else {
    return -1;
  }
}
export async function checkUserName(username) {
  let newhead = api.headers;
  newhead["username"] = username;
  newhead["check"] = "false";
  let res = await fetch(`${api.url}/${api.routes.user}`, {
    method: "POST",
    headers: newhead,
    signal: AbortSignal.timeout(500),
  });

  if (res.status === 200) {
    return false;
  }
  return true;
}

export async function getFileHash(file, algorithm = "SHA-256") {
  return await getFFileHash(file, algorithm);
}

export class FilePicker {
  constructor(options = {}) {
    this.accept =
      options.accept ||
      "image/png, image/gif, image/jpeg, image/webp, video/mp4, video/webm, audio/mpeg, audio/wav, audio/ogg";
    this.multiple = options.multiple || false;
    this.onFileSelect = options.onFileSelect || (() => {});
    this.createInput();
  }

  createInput() {
    if (this.input && this.input.parentNode) {
      this.input.parentNode.removeChild(this.input);
    }

    this.input = document.createElement("input");
    this.input.type = "file";
    this.input.accept = this.accept;
    this.input.multiple = this.multiple;
    this.input.style.display = "none";

    this.input.onchange = (e) => {
      const files = Array.from(e.target.files);
      this.onFileSelect(files);
      this.reset();
    };

    document.body.appendChild(this.input);
  }

  open() {
    this.input.click();
  }

  reset() {
    this.createInput();
  }
}

export function UserState({
  matrix_Id = "",
  currentCursor = null,
  logout = false,
  getState = true,
} = {}) {
  if (logout) {
    localStorage.clear();
    return;
  }
  if (matrix_Id !== "") {
    localStorage.setItem("matrix_id", matrix_Id);
    return;
  }
  if (currentCursor !== null) {
    if (currentCursor === "") {
      return localStorage.getItem("currentCursor");
    } else {
      localStorage.setItem("currentCursor", currentCursor);
    }
  }
  if (getState) {
    let mt = localStorage.getItem("matrix_id");
    if (mt !== null) {
      return { matrixId: mt };
    } else {
      return false;
    }
  }
}
export async function checkConnction() {
  let res = await fetch(`${api.url}/${api.routes.check_connection}`, {
    method: "GET",
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (res.ok) {
    return true;
  } else {
    return false;
  }
}
export function connectionLost({ hideId = "", reload = false } = {}) {
  let chec = $("lostconnection_box");
  if (chec === null) {
    let error_html = `
   <section class="lostconn" id="lostconnection_box">
      <div class="corners rematrix_corners">
        <div class="lostcon_container">
          <svg viewBox="0 0 24 18" shape-rendering="crispEdges">
            <rect x="11" y="13" width="2" height="1" />
            <rect x="11" y="15" width="2" height="1" />
            <rect x="10" y="14" width="1" height="1" />
            <rect x="13" y="14" width="1" height="1" />
            <rect x="10" y="10" width="4" height="1" />
            <rect x="9" y="11" width="1" height="1" />
            <rect x="14" y="11" width="1" height="1" />
            <rect x="8" y="7" width="8" height="1" />
            <rect x="7" y="8" width="1" height="1" />
            <rect x="16" y="8" width="1" height="1" />
            <rect x="5" y="4" width="14" height="1" />
            <rect x="4" y="5" width="1" height="1" />
            <rect x="19" y="5" width="1" height="1" />
          </svg>
          <h3>
          <span id="lost_con_text">Please check your connection${
            reload ? ", and refresh this page." : ""
          }</span>
          </h3>
          <div class="refresh_container">
            <button
            id="refresh_button"
              class="rematrix_corners corners_button rematrix_button"
            >
              <div>
                <span  class="animated_text">${
                  reload ? "Refresh" : "Retry"
                }</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
    let hideElement = $(hideId);
    const oldElementDisplay = hideElement.style.display;
    hideElement.style.display = "none";
    hideElement.insertAdjacentHTML("beforebegin", error_html);
    navigator.vibrate([5, 2, 5, 2, 5]);
    const lostconbox = $("lostconnection_box");
    const refreshButton = $("refresh_button");
    if (reload) {
      refreshButton.onclick = () => {
        window.location.reload();
      };
    } else {
      refreshButton.onclick = async () => {
        const ress = await checkConnction();
        if (ress) {
          lostconbox.style.display = "none";
          hideElement.style.display = oldElementDisplay;
        } else {
          const text = $("lost_con_text");
          text.style.animation = "none";
          await sleep(0.1);
          text.style.animation = "missing_element 0.5s";
          navigator.vibrate([5, 2, 5, 2, 5]);
        }
      };
    }
  } else {
    const lostconbox = $("lostconnection_box");
    const hideElement = $(hideId);
    hideElement.style.display = "none";
    lostconbox.style.display = "block";
    navigator.vibrate([5, 2, 5, 2, 5]);
  }
}
export function checkImg({
  src = "",
  onload = () => {},
  onerror = () => {},
} = {}) {
  const hiddenImg = document.createElement("img");
  hiddenImg.setAttribute("src", src);
  hiddenImg.onload = onload;
  hiddenImg.onerror = onerror;
}
export class postsLogic {
  constructor({ limit = 20 } = {}) {
    this.limit = limit;
    this.posts = [];
    this.fetching = false;
    this.theEnd = false;
  }
  async fetchposts({ init = true } = {}) {
    if (this.fetching) {
      return [];
    }
    try {
      this.fetching = true;
      const current_cursor = UserState({ currentCursor: "" });
      let fetchLink = `${api.url}/${api.routes.posts}`;
      fetchLink += init === true ? "" : `?cursor=${current_cursor}`;
      fetchLink +=
        this.limit != 20 ? `${init ? "?" : "&"}limit=${this.limit}` : "";
      let res = await fetch(fetchLink, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      });
      let json = await res.json();
      UserState({ currentCursor: json["next_cursor"] });
      let resPosts = json["posts"];
      let handheldPosts = [];
      for (let element of resPosts) {
        element["href"] = `${routes.postPage}?id=${element["post_id"]}`;
        element[
          "src"
        ] = `${api.url}/${api.routes.media}?id=${element["media_id"]}`;
        try {
          element["theme"] = JSON.parse(atob(element["theme"]));
        } catch (e) {}
        handheldPosts.push(element);
        this.posts.push(element);
      }
      this.fetching = false;
      if (json["next_cursor"] === null) {
        this.theEnd = true;
      }
      return handheldPosts;
    } catch (e) {
      this.fetching = false;
      return null;
    }
  }
}
export class ReMatrixImage {
  current_buffer_url;
  constructor({
    seed = null,
    type = "combined",
    bk_type = "delusional",
    pixelated_effect = false,
    cyber_effect = false,
    early_internet_effect = false,
  } = {}) {
    this.seed = seed;
    this.type = type;
    this.bk_type = bk_type;
    this.pixelated_effect = pixelated_effect;
    this.cyber_effect = cyber_effect;
    this.early_internet_effect = early_internet_effect;
  }

  async generate() {
    try {
      const res = await fetch(
        `${api.url}/${api.routes.gen_rematrix_picture}?gen_type=temp&seed=${this.seed}&type=${this.type}&bk_type=${this.bk_type}&pixelated_effect=${this.pixelated_effect}&cyber_effect=${this.cyber_effect}&early_internet_effect=${this.early_internet_effect}`
      );
      if (res.ok) {
        const reader = res.body.getReader();
        const chunks = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const blob = new Blob(chunks);
        this.current_buffer_url = URL.createObjectURL(blob);
        this.seed = res.headers.get("Seed");
      }
    } catch {
      this.current_buffer_url = null;
    }
  }
}
export async function fetchPost(postId, Delete = false) {
  try {
    let res = await fetch(
      `${api.url}/${api.routes.post}?id=${postId}&metadata=true${
        Delete ? "&delete=true" : ""
      }`,
      {
        method: "GET",
      }
    );
    if (res.ok) {
      if (Delete) {
        return 200;
      }
      return await res.json();
    } else if (res.status === 404) {
      return 404;
    }
  } catch {}
  return -1;
}

export class userProfile {
  userPosts;
  userName;
  matrixId;
  creationDate;
  pfp;
  ig;
  tg;
  dc;
  __edit = false;
  __fetched = false;

  constructor({ __matrixId } = {}) {
    this.__matrixId = __matrixId;
  }
  async __fetch() {
    try {
      let res = await fetch(
        `${api.url}/${api.routes.user}?id=${this.matrixId}`,
        {
          method: "GET",
        }
      );
      if (res.ok) {
        return await res.json();
      } else {
        return false;
      }
    } catch (e) {
      return -1;
    }
  }
  async init() {
    this.userPosts = [];
    let userRes = await checkUser();
    if (userRes === -1) {
      userRes = await checkUser();
    }
    if (this.__matrixId !== "") {
      this.matrixId = this.__matrixId;
    } else {
      if (userRes === -1) {
        return -1;
      } else if (userRes[0] === false) {
        return false;
      } else {
        this.matrixId = userRes[1];
      }
    }
    const jso = await this.__fetch();
    if (jso === -1) {
      return -1;
    } else if (jso === false) {
      return false;
    } else {
      for (let element of jso.posts) {
        element["href"] = `${routes.postPage}?id=${element["post_id"]}`;
        element[
          "src"
        ] = `${api.url}/${api.routes.media}?id=${element["media_id"]}`;
        try {
          element["theme"] = JSON.parse(atob(element["theme"]));
        } catch (e) {}
        this.userPosts.push(element);
      }
      this.userName = jso.username;
      this.creationDate = jso.date;
      this.pfp = jso.pfp;
      this.ig = jso.ig;
      this.tg = jso.tg;
      this.dc = jso.dc;
      if (userRes !== -1) {
        if (userRes[0] !== false) {
          this.__edit = jso.matrix_id === userRes[1] ? true : false;
        }
      }
    }
    this.__fetched = true;
    return this.__fetched;
  }
}

export async function uploadMedia({
  file,
  is_pfp = false,
  on_loading = (percent, state) => {},
}) {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_pfp_str", `${is_pfp}`);
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        on_loading(`${percentComplete.toFixed(2)}%`, true);
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        resolve(xhr.responseText);
      } else {
        on_loading(``, false);
        if (xhr.status === 422 || xhr.status === 413) {
          resolve({ code: xhr.status, res: xhr.responseText });
        }
        resolve(-1);
      }
    });
    xhr.addEventListener("error", () => {
      on_loading(``, false);
      resolve(false);
    });
    xhr.addEventListener("abort", () => {
      on_loading(``, false);
      resolve(false);
    });

    xhr.open("POST", `${api.url}/${api.routes.media_upload}`);
    xhr.send(formData);
  });
}

// -------------Elements----------------
export function buildImgElement({
  href = "",
  title = "",
  src = "",
  alt = "",
  mansoryInst = null,
  theme = {},
} = {}) {
  // console.log(theme);
  const container_classes = [
    "media_viewer",
    "rematrix_corners",
    "corners_picture",
  ];
  const container = document.createElement("div");
  container.style.height = "200px";
  container.classList = container_classes.join(" ");
  const aElemenet = document.createElement("a");
  aElemenet.setAttribute("href", href);
  aElemenet.classList += "media_view_wrapper";
  const loaderElement = document.createElement("div");
  loaderElement.classList.add("temploader");
  loaderElement.innerHTML = `<div class="temploader-dot"></div><div class="temploader-dot"></div><div class="temploader-dot"></div>`;
  aElemenet.appendChild(loaderElement);
  const imgElement = document.createElement("img");
  imgElement.setAttribute("src", src);
  imgElement.setAttribute("alt", alt);
  imgElement.classList.add("homepage_img");
  imgElement.onload = () => {
    aElemenet.removeChild(loaderElement);
    container.style.height = null;
    aElemenet.appendChild(imgElement);
    aElemenet.style.flexDirection = "column-reverse";
    if (mansoryInst !== null) {
      mansoryInst.layout();
    }
  };
  imgElement.onerror = () => {
    container.style.display = "none";
  };
  const textElement = document.createElement("div");
  textElement.innerText += title;
  // -------------------
  container.appendChild(aElemenet);

  aElemenet.append(textElement);

  return container;
}
export function buildMediaElement({
  href = "",
  title = "",
  mediaSrc = "",
  type,
  player = "/js/elements/media_player/player.html",
} = {}) {
  let container_classes = [
    "media_viewer",
    "rematrix_corners",
    "corners_picture",
  ];
  let src = `${player}?file=${mediaSrc}&hide=true&type=${type}`;
  let container = document.createElement("div");
  container.classList = container_classes.join(" ");
  let aElemenet = document.createElement("a");
  aElemenet.setAttribute("href", href);
  aElemenet.classList += "media_view_wrapper";
  let iframeElement = document.createElement("iframe");
  iframeElement.setAttribute("src", src);
  iframeElement.setAttribute("data-id", mediaSrc);
  let textElement = document.createElement("div");
  textElement.innerText += title;
  // -------------------
  container.appendChild(aElemenet);
  aElemenet.appendChild(iframeElement);
  aElemenet.append(textElement);
  return container;
}

export class buildMultiChoosesElement {
  spans = [];
  currentChoise = "";
  parent;
  constructor({
    parentElementId = null,
    elementId = "",
    elementTitle = "",
    chooses = [],
    defaultChoise = "",
    onValue = "",
    onValueFunc = () => {},
    onNotValueFunc = () => {},
  } = {}) {
    this.parentElementId = parentElementId;
    this.elementId = elementId;
    this.elementTitle = elementTitle;
    this.chooses = chooses;
    this.defaultChoise = defaultChoise;
    this.currentChoise = this.defaultChoise;
    this.onValue = onValue;
    this.onValueFunc = onValueFunc;
    this.onNotValueFunc = onNotValueFunc;
    let _parent = document.createElement("dev");
    let _p = document.createElement("p");
    _p.classList.add("green_p");
    _p.innerText = this.elementTitle;
    let choosesParent = document.createElement("dev");
    choosesParent.classList.add("multiple_choices");
    for (const i of this.chooses) {
      let sp = document.createElement("span");
      sp.classList.add("multiple_choices_span");
      sp.innerText = i;
      sp.onclick = (_) => {
        this.changeValue(i);
        if (this.onValue === i) {
          this.onValueFunc();
        } else {
          this.onNotValueFunc();
        }
      };
      if (this.currentChoise === i) {
        sp.setAttribute("enabled", "");
      }
      this.spans.push(sp);
      choosesParent.appendChild(sp);
    }
    _parent.appendChild(_p);
    _parent.appendChild(choosesParent);
    $(this.parentElementId).appendChild(_parent);
    this.parent = _parent;
  }
  changeValue(newVal) {
    this.currentChoise = newVal;
    for (const i of this.spans) {
      if (i.innerText === newVal) {
        i.removeAttribute("disabled");
        i.setAttribute("enabled", "");
      } else {
        i.removeAttribute("enabled");
        i.setAttribute("disabled", "");
      }
    }
  }
  setState({ hidden = false } = {}) {
    if (hidden) {
      this.parent.style.display = "none";
    } else {
      this.parent.style.display = "block";
    }
  }
  reset() {
    this.changeValue(this.defaultChoise);
  }
}

export class mansoryViewer {
  constructor(container, { minWidth = 250, gap = 5, max_cols = null } = {}) {
    this.el = container;
    this.minWidth = minWidth;
    this.gap = gap;
    this.max_cols = max_cols;
    this.items = [...container.children];

    let t;

    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(() => this.layout(), 100);
    });
  }

  layout() {
    const width = this.el.clientWidth;
    const guess_cols = Math.max(
      1,
      Math.floor((width + this.gap) / (this.minWidth + this.gap))
    );
    const cols =
      this.max_cols === null
        ? guess_cols
        : guess_cols > this.max_cols
        ? this.max_cols
        : guess_cols;

    const colWidth = (width - this.gap * (cols - 1)) / cols;

    const heights = new Array(cols).fill(0);

    const measurements = this.items.map((el) => {
      el.style.width = colWidth + "px";
      return el.offsetHeight;
    });

    this.items.forEach((el, i) => {
      let col = 0;

      for (let j = 1; j < cols; j++) if (heights[j] < heights[col]) col = j;

      const x = col * (colWidth + this.gap);
      const y = heights[col];

      el.style.left = x + "px";
      el.style.top = y + "px";

      heights[col] += measurements[i] + this.gap;
    });

    this.el.style.height = Math.max(...heights) + "px";
  }

  append(el) {
    this.el.appendChild(el);
    this.items.push(el);
    this.layout();
  }
}
