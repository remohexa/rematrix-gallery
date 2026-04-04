// animations
import { $ } from "../js/root.js";
export function loadCss() {
  let head = document.head;

  if (!head.getHTML().includes("extracss.css")) {
    let link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "/js/extracss.css");
    head.appendChild(link);
  }
}
// const sfx = new Audio("/js/glitch.ogg");

export function missingField(...eles) {
  loadCss();
  //   sfx.play();
  eles.forEach((i) => {
    let ele = document.getElementById(i);
    ele.style.removeProperty("animation");
    ele.style.animation = "missing_element 0.400s linear 1";
  });
  navigator.vibrate([5, 2, 5, 2, 5]);
  let close = false;
  setTimeout(() => {
    eles.forEach((i) => {
      let ele = document.getElementById(i);
      ele.style.removeProperty("animation");
    });
  }, 400);
}
let TimeOUT;
let redColor = "rgb(211, 0, 0)";
export function showErrorBoxes(
  id,
  textContent,
  durMs = 2000,
  showAni = false,
  color = "",
  revert = false
) {
  let errorBox = $(id);
  errorBox.style.color = redColor;
  let old_html = errorBox.innerHTML;
  let old_style = { ...errorBox.style };
  if (color !== "") {
    errorBox.style.color = color;
  }
  TimeOUT ? clearTimeout(TimeOUT) : null;
  errorBox.textContent = textContent || "";
  errorBox.classList.remove("animate_hidden");
  errorBox.classList.add("animate_shown");
  showAni ? missingField("error_box") : null;
  TimeOUT = setTimeout((_) => {
    errorBox.classList.remove("animate_shown");
    if (revert) {
      errorBox.innerHTML = old_html;
      errorBox.style = old_style;
      missingField("error_box");
    } else {
      errorBox.classList.add("animate_hidden");
    }

    if (color !== "") {
      errorBox.style.color = redColor;
    }
  }, durMs);
}
