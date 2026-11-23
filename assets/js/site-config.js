/*
 * Contact details shown in the 联系 section. Fill these in before publishing.
 * Empty values render as "待填写" placeholders. Nothing here is sent anywhere.
 */
(function (root) {
  var SITE_CONFIG = {
    email: "kerry@muse.ai",
    wechat: "",
    phone: ""
  };
  if (typeof module === "object" && module.exports) module.exports = SITE_CONFIG;
  else root.SITE_CONFIG = SITE_CONFIG;
})(this);
