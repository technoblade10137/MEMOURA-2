# MEMOURA

MEMOURA is a mobile-first Progressive Web App prototype for memory games, routines, caregiver monitoring, reminders, and location support for elderly patients.

## Run locally

1. Open a terminal in this folder.
2. Start a local server:

   ```bash
   python -m http.server 8000
   ```

3. Open http://localhost:8000 in a browser.

## Demo flow

- Choose a patient role or caregiver role on the welcome screen.
- Patient registration creates a patient profile.
- Caregiver registration links to the same patient in the shared local data store.
- Caregiver can add reminders, routines, and upload a jigsaw image.
- Patient can choose a mood, view activities, and play games.
- Session results are saved and influence the next activity difficulty.
- Everything runs from browser localStorage, so the patient and caregiver share the same local store.

## Notes

- The app is intentionally simple and beginner-friendly.
- The design emphasizes large buttons, large text, and calm colors.
- The prototype includes all six games and seeded demo data.
