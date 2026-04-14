import { createApp } from "vue";
import ElementPlus from "element-plus";
import VXETable from "vxe-table";

import App from "./App.vue";
import "element-plus/dist/index.css";
import "vxe-table/lib/style.css";
import "./styles/design-tokens.css";
import "./styles/element-override.css";
import "./styles/global.css";


createApp(App).use(ElementPlus).use(VXETable).mount("#app");
