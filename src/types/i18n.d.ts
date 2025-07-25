import "react-i18next";
import { resources } from "../i18n/i18n";

// Define namespace resources
declare module "react-i18next" {
  interface CustomTypeOptions {
    resources: (typeof resources)["en"];
  }
}
