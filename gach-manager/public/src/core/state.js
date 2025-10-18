window.GM_state = {
  products:[], imports:[], exports:[], customers:[], history:[],
  loaded:false
};

window.GM_stateAPI = {
  loadFromStorage(){
    const S = GM_CONST.STORAGE;
    GM_state.products = GM_storage.read(S.PRODUCTS);
    GM_state.imports = GM_storage.read(S.IMPORTS);
    GM_state.exports = GM_storage.read(S.EXPORTS);
    GM_state.customers = GM_storage.read(S.CUSTOMERS);
    GM_state.history = GM_storage.read(S.HISTORY);
    GM_state.loaded = true;
  },
  async persistAll(){
    const S = GM_CONST.STORAGE;
    await GM_storage.write(S.PRODUCTS, GM_state.products);
    await GM_storage.write(S.IMPORTS, GM_state.imports);
    await GM_storage.write(S.EXPORTS, GM_state.exports);
    await GM_storage.write(S.CUSTOMERS, GM_state.customers);
    await GM_storage.write(S.HISTORY, GM_state.history);
  }
};