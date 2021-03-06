import {html} from "../../_snowpack/pkg/ube.js";
import {icon} from "../helpers/icon.js";
import {state} from "../services/State.js";
import {goTo} from "../helpers/goTo.js";
export const tabs = () => {
  return html`
    <nav class="tabs">
      ${state.tabs.sort((a, b) => a.weight - b.weight).map((tab) => html`
        <span class=${`tab ${!tab.closable ? "sticky" : ""} ${tab.jsonLd && !tab.fileHandle ? "unsaved" : ""} ${tab.link.substr(1)} ${tab.link === location.pathname ? "active" : ""}`}>
          <a class="tab-link" href=${tab.link} onclick=${(event) => {
    event.target.scrollIntoView();
  }}>
            ${tab.title}
            ${tab.jsonLd && !tab.fileHandle ? html`<span class="unsaved">*</span>` : ""}
          </a>
          ${tab.closable ? html`
            <button class="close-file" onclick=${() => {
    state.removeTab(tab);
    goTo("/");
  }}>${icon("close")}</button>
          ` : null}
        </span>
      `)}
    </nav>
  `;
};
