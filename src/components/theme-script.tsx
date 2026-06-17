import { site } from "@/content/site";
import Script from "next/script";

const themeInit = `(function () {
  try {
    var storageKey = "${site.themeStorageKey}";
    var storedTheme = window.localStorage.getItem(storageKey);
    var theme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    var root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch (e) {}
})();`;

/** Theme bootstrap — use next/script so locale client navigations do not hit raw <script> in React. */
export function ThemeScript() {
  return (
    <Script id="theme-init" strategy="beforeInteractive">
      {themeInit}
    </Script>
  );
}
