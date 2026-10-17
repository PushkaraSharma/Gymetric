const { withAppDelegate } = require("expo/config-plugins")

const CONFIGURE = "FirebaseApp.configure()"
const RETURN_SUPER =
  "return super.application(application, didFinishLaunchingWithOptions: launchOptions)"

/** RNFirebase 23 looks for factory.startReactNative(); SDK 58 AppDelegate no longer has that. */
module.exports = function withFirebaseConfigure(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") return config
    let src = config.modResults.contents
    if (src.includes(CONFIGURE) || !src.includes(RETURN_SUPER)) return config
    config.modResults.contents = src.replace(
      RETURN_SUPER,
      `${CONFIGURE}\n    ${RETURN_SUPER}`,
    )
    return config
  })
}
