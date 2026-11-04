/* =========================================================
   Flora of SXC — Admin Access Configuration
   ---------------------------------------------------------
   1. Create an OAuth 2.0 Client ID at https://console.cloud.google.com/
      (APIs & Services -> Credentials -> Create Credentials -> OAuth client ID
       -> Application type: Web application). Add your site URL under
      "Authorized JavaScript origins".
   2. Paste that Client ID below.
   3. List the exact Gmail addresses that are allowed to manage tree data.
      Only these accounts will see the "Add / Edit / Delete Tree" tools.

   IMPORTANT SECURITY NOTE (please read):
   This is a static website with no server-side backend. This file only
   controls what the ADMIN PANEL SHOWS in the browser after a real Google
   Sign-In. It verifies the visitor's Gmail identity using Google's own
   Sign-In popup (so nobody can fake "being" your Gmail account), but the
   underlying data-table endpoints are not protected by a server login —
   anyone who knew the direct API URL could still write to the table. For a
   fully secure gate we'd need a real backend/auth-checked API, which a pure
   static site cannot provide. Keep this in mind for sensitive data.
   ========================================================= */

const ADMIN_CONFIG = {
  // Replace with your own OAuth Client ID from Google Cloud Console
  googleClientId: 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com',

  // Only these Gmail addresses will be granted admin (add/edit/delete) access
  allowedAdmins: [
    'youradmin@gmail.com'
  ]
};
