import {bindingsToObjects} from "../helpers/bindingsToObjects.js";
import {hash} from "../helpers/hash.js";
import {importGlobalScript} from "../helpers/importGlobalScript.js";
import {Store, Parser} from "../../_snowpack/pkg/n3.js";
import {toRDF, expand} from "../../_snowpack/pkg/jsonld.js";
import ttl2jsonld from "../../_snowpack/pkg/@frogcat/ttl2jsonld.js";
class State {
  constructor() {
    this.forms = null;
    this.#tabs = [];
  }
  #tabs;
  #store;
  async init() {
    const {newEngine} = await importGlobalScript("https://rdf.js.org/comunica-browser/versions/latest/packages/actor-init-sparql/comunica-browser.js", "Comunica");
    this.queryEngine = newEngine();
    this.#store = new Store();
    const parser = new Parser({format: "application/n-quads"});
    window.addEventListener("tab-added", async (event) => {
      if (event.detail.jsonLd) {
        const nquads = await toRDF(event.detail.jsonLd, {format: "application/n-quads"});
        await parser.parse(nquads, (error, quad, prefixes) => {
          if (error)
            console.log(`PARSE ERROR: ${error}`);
          if (quad)
            this.#store.addQuad(quad);
        });
      }
    });
  }
  get domains() {
    return this.settings?.["http://schema.org/url"]?.map((item) => item["@value"]) ?? [];
  }
  get settings() {
    return localStorage.settings ? JSON.parse(localStorage.settings) : {};
  }
  set settings(newValue) {
    localStorage.settings = JSON.stringify(newValue);
  }
  get store() {
    return this.#store;
  }
  async getForms() {
    if (this.forms !== null)
      return this.forms;
    const formsResponse = await this.queryEngine.query(`
      PREFIX forms: <http://localhost:8080/ttl/ontology.ttl#>
      SELECT ?o WHERE { ?s forms:availableForm ?o }
    `, {
      sources: this.domains
    });
    const formsUrls = await bindingsToObjects(formsResponse);
    const labelsResponse = await this.queryEngine.query(`
      PREFIX form: <http://rdf.danielbeeke.nl/form/form-dev.ttl#>
      SELECT ?label ?form ?binding WHERE { 
        ?form a form:Form .
        ?form form:label ?label . 
        ?form form:binding ?binding .
      }
    `, {
      sources: formsUrls
    });
    this.forms = await bindingsToObjects(labelsResponse);
    for (const item of this.forms) {
      item.hash = await hash(item.form);
    }
    return this.forms;
  }
  async addTab(options) {
    const newTab = Object.assign({
      title: "",
      link: "",
      closable: false,
      weight: 0
    }, options);
    if (newTab.fileHandle) {
      newTab.title = newTab.fileHandle.name;
      const file = await newTab.fileHandle.getFile();
      const text = await file.text();
      if (file.name.includes(".ttl")) {
        newTab.jsonLd = await ttl2jsonld.parse(text);
      } else {
        try {
          const originalJsonLd = JSON.parse(text);
          newTab.jsonLd = (await expand(originalJsonLd))[0];
        } catch (exception) {
          newTab.jsonLd = {};
        }
      }
    }
    if (!newTab.link) {
      newTab.id = await hash(newTab.jsonLd + Math.random() + new Date().getTime());
      newTab.link = `/file/${newTab.id}`;
    }
    this.#tabs.push(newTab);
    window.dispatchEvent(new CustomEvent("tab-added", {
      detail: newTab
    }));
    return newTab;
  }
  get tabs() {
    return this.#tabs;
  }
  removeTab(tab) {
    this.#tabs = this.#tabs.filter((innerTab) => innerTab !== tab);
  }
}
export const state = new State();
await state.init();
