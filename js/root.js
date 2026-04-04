import { getFFileHash } from "./elements/js-sha256.js";
import { genList } from "./gen.js";
import { remohexa_account } from "./remohexa.js";
export const $ = (id) => document.getElementById(id);
export const $c = (element_name) => document.createElement(element_name);

const preview_storage = [
  "first",
  "logged_in",
  "widescreen",
  "mediaHashList",
  "media -> m0x",
  "posts -> p0x",
  "users -> 0x",
];

export function toHex(num) {
  return `0x${num.toString(16)}`;
}
export function fromHex(string) {
  if (string.startsWith("0x")) {
    return parseInt(string.slice(2), 16);
  } else {
    return parseInt(string, 16);
  }
}
export class IndexedDB {
  #db = null;

  constructor(name = "Rematrix-Gallery-Preview", version = 1) {
    this.name = name;
    this.version = version;
  }

  async #init() {
    if (this.#db) return;
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.name, this.version);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("files"))
          db.createObjectStore("files", { keyPath: "name" });
        if (!db.objectStoreNames.contains("values"))
          db.createObjectStore("values", { keyPath: "name" });
      };

      req.onsuccess = (e) => {
        this.#db = e.target.result;
        res();
      };
      req.onerror = (e) => rej(e.target.error);
    });
  }

  #tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.#db.transaction(store, mode);
      const s = t.objectStore(store);
      const req = fn(s);
      req.onsuccess = () => res(req.result);
      req.onerror = (e) => rej(e.target.error);
    });
  }

  async saveFile(name, file) {
    if (!name || !file) {
      return null;
    }
    await this.#init();
    return this.#tx("files", "readwrite", (s) => s.put({ name, file }));
  }

  async getFileBlobURL(name) {
    if (!name) {
      return null;
    }
    await this.#init();
    const result = await this.#tx("files", "readonly", (s) => s.get(name));
    if (!result) return null;
    return URL.createObjectURL(result.file);
  }

  async deleteFile(name) {
    if (!name) {
      return null;
    }
    await this.#init();
    return this.#tx("files", "readwrite", (s) => s.delete(name));
  }

  async listFiles() {
    await this.#init();
    return this.#tx("files", "readonly", (s) => s.getAllKeys());
  }
  async ___() {
    if ((await this.get("lastpostid")) === null) {
      this.set("lastpostid", remohexa_account.posts.length + 2);
    }
    if ((await this.get("lastmediaid")) === null) {
      this.set("lastmediaid", remohexa_account.posts.length + 5);
    }
    if ((await this.get("lastuserid")) === null) {
      this.set("lastuserid", 2);
    }
  }
  async getNewPostId() {
    await this.___();
    const lastId = await this.get("lastpostid");
    this.set("lastpostid", lastId + 1);
    return `p${toHex(lastId + 1)}`;
  }
  async getNewUserId() {
    await this.___();
    const lastId = await this.get("lastuserid");
    this.set("lastuserid", lastId + 1);
    return toHex(lastId + 1);
  }
  async getNewMediaId() {
    await this.___();
    const lastId = await this.get("lastmediaid");
    this.set("lastmediaid", lastId + 1);
    return `m${toHex(lastId + 1)}`;
  }

  async set(name, value) {
    if (!name || value === null || value === undefined) {
      return null;
    }
    await this.#init();
    return this.#tx("values", "readwrite", (s) => s.put({ name, value }));
  }

  async get(name, dummy = false) {
    if (!name) {
      return null;
    }
    await this.#init();
    const result = await this.#tx("values", "readonly", (s) => s.get(name));
    if (!result && name === "account" && dummy) {
      return {};
    }
    return result?.value ?? null;
  }

  async delete(name) {
    if (!name) {
      return null;
    }
    await this.#init();
    return this.#tx("values", "readwrite", (s) => s.delete(name));
  }

  async list() {
    await this.#init();
    return this.#tx("values", "readonly", (s) => s.getAllKeys());
  }
}
export const DDB = new IndexedDB();
if (window.innerWidth > 600 && (await DDB.get("widescreen")) === null) {
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
     id = "wideScreenButton"
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
    await DDB.set("widescreen", true);
    location.reload();
  };
}

export let routes = {
  homepage: "/",
  postPage: "/html/post.html",
  login: "/html/login.html",
  register: "/html/register.html",
  upload: "/html/upload.html",
  userProfile: "/html/user.html",
  404: "/html/404.html",
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
export function bytesToHuman(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) {
    return `${bytes} ${sizes[i]}`;
  }
  const value = (bytes / Math.pow(k, i)).toFixed(dm);
  return `${parseFloat(value)} ${sizes[i]}`;
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
export function randomUUID() {
  const stuff = [
    "q",
    "w",
    "e",
    "r",
    "t",
    "y",
    "u",
    "i",
    "o",
    "p",
    "a",
    "s",
    "d",
    "f",
    "g",
    "h",
    "j",
    "k",
    "l",
    "z",
    "x",
    "c",
    "v",
    "b",
    "n",
    "m",
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
  ];
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  } else {
    let text = "";
    for (let I = 0; I !== 25; I++) {
      if (I !== 0 && I % 5 === 0) {
        text += "-";
      }
      text += stuff[Math.floor(Math.random() * stuff.length)];
    }
    return text.toUpperCase();
  }
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
  // This is a preview version right? so I thought removing the pixel effect won't be a big deal. since generating 24 different variants of the same img takes a lot of unnecessary space.

  current_buffer_url;
  constructor({
    seed = null,
    type = "combined",
    bk_type = "delusional",
    cyber_effect = false,
    early_internet_effect = false,
  } = {}) {
    this.seed = seed;
    this.type = type;
    this.bk_type = bk_type;
    this.cyber_effect = cyber_effect;
    this.early_internet_effect = early_internet_effect;
  }

  async generate() {
    if (!this.seed) {
      this.seed = genList[Math.floor(Math.random() * genList.length)];
    }
    let url = `/assets/gen/${this.seed}/${this.type.slice(
      0,
      4
    )}_${this.bk_type.slice(0, 4)}`;
    if (this.early_internet_effect || this.cyber_effect) {
      if (this.early_internet_effect && this.cyber_effect) {
        url += "_both.webp";
      } else if (this.early_internet_effect) {
        url += "_int.webp";
      } else {
        url += "_cy.webp";
      }
    } else {
      url += "_none.webp";
    }

    this.current_buffer_url = url;

    await sleep(Math.random() > 0.1 ? 0 : Math.floor(Math.random() * 3));
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
