import assert from "node:assert/strict";
import test from "node:test";
import {
  departuresForPlan,
  planAppliesToDeparture,
  plansForDeparture,
  publishedTripPlans,
  tripPlanLabel,
} from "../lib/trip-plans.ts";

const departures = [
  { id: "departure-a", date: "2026/09/01", price: "30,000" },
  { id: "departure-b", date: "2026/09/08", price: "32,000" },
];

const allPlan = {
  id: "plan-all",
  airline: "長榮航空",
  title: "早去晚回",
  summary: "",
  price: "",
  documentType: "pdf",
  documentUrl: "/api/trip-pdf?key=trip-pdfs%2Fexample.pdf",
  documentName: "長榮行程.pdf",
  departureMode: "all",
  departureIds: [],
};

const selectedPlan = {
  ...allPlan,
  id: "plan-selected",
  airline: "中華航空",
  title: "午去午回",
  documentUrl: "https://drive.google.com/file/d/example/view",
  documentType: "drive",
  departureMode: "selected",
  departureIds: ["departure-b"],
};

test("all-date and selected-date plans map to the correct departures", () => {
  assert.equal(planAppliesToDeparture(allPlan, "departure-a"), true);
  assert.equal(planAppliesToDeparture(selectedPlan, "departure-a"), false);
  assert.equal(planAppliesToDeparture(selectedPlan, "departure-b"), true);
  assert.deepEqual(departuresForPlan(departures, selectedPlan), [departures[1]]);
});

test("only published plans appear for each departure", () => {
  const unpublishedPlan = {
    ...selectedPlan,
    id: "plan-unpublished",
    documentUrl: "",
  };

  assert.deepEqual(
    publishedTripPlans({ plans: [allPlan, selectedPlan, unpublishedPlan] }),
    [allPlan, selectedPlan],
  );
  assert.deepEqual(
    plansForDeparture(
      [allPlan, selectedPlan, unpublishedPlan],
      "departure-a",
    ),
    [allPlan],
  );
  assert.deepEqual(
    plansForDeparture(
      [allPlan, selectedPlan, unpublishedPlan],
      "departure-b",
    ),
    [allPlan, selectedPlan],
  );
});

test("plan labels make airline and itinerary differences explicit", () => {
  assert.equal(tripPlanLabel(selectedPlan), "中華航空｜午去午回");
});
