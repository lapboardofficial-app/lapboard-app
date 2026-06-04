// Set this to false when you want the app to start with no sample laps/accounts.
import { importedSplitLapTimes } from "./importedSplitLapTimes";

export const ENABLE_SAMPLE_DATA = true;

export const sampleAccounts = [
  {
    username: "You",
    city: "Torrance, California",
    bio: "Imported split-record lap history.",
    friends: []
  },
  {
    username: "CSVDriver",
    city: "",
    bio: "CSV import example account.",
    friends: []
  }
];

export const sampleLapTimes = importedSplitLapTimes.map((lap) => ({
  ...lap,
  layout: "Main layout",
  visibility: "private"
}));
