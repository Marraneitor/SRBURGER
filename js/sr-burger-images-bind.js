import { onBurgerImagesOrderChange } from "./sr-burger-images-order.js";

function renderInto(container, images) {
  container.innerHTML = (images || []).map((url) => `
    <img src="${url}" alt="" class="w-full h-auto rounded-2xl" loading="lazy">
  `).join("");
}

export function bindBurgerImages(selector = "[data-sr-burger-images]") {
  const containers = Array.from(document.querySelectorAll(selector));
  if (!containers.length) return () => {};

  const unsubs = containers.map((c) =>
    onBurgerImagesOrderChange((images) => renderInto(c, images))
  );

  return () => unsubs.forEach((u) => { try { u && u(); } catch {} });
}

// auto-bind
document.addEventListener("DOMContentLoaded", () => {
  try { bindBurgerImages(); } catch (e) { console.error(e); }
});
