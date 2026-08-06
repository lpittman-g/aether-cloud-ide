document.getElementById("pulse")?.addEventListener("click", () => {
  document.body.style.filter =
    document.body.style.filter === "hue-rotate(40deg)"
      ? "none"
      : "hue-rotate(40deg)";
});
