1. The Relationship Model (ERD)
This shows how your data "parents" one another. Each arrow represents a "belongs to" relationship.
* Gym (The Root): Owns everything. If you delete a Gym, all its clients and plans vanish.
* Plan (The Template): Defines what can be sold (e.g., "3 Month Pro").
* Client (The Entity): Contains the person's identity.
* Membership History (The Child): Every time a client buys a plan, a new record is created here, linking the Client to a Plan.
* Payment History (The Receipt): Every transaction is logged here for revenue tracking.

2. The Functional Flow (User Journey)
This is the logical "Path" the app takes when a new person walks into the gym.
Step A: Setup (One-time or occasional)
1. Admin logs in.
2. Admin goes to Settings -> Creates Membership Plans (Price, Duration, Name).
3. Data is saved to the Plan collection.
Step B: Onboarding (The "Add Client" Flow)
1. Admin fills out Client Details (Name, Phone, etc.).
2. Admin selects a Plan from a dropdown (fetched from the Plan collection).
3. Logic Trigger:
    * System looks at the Plan's durationInDays.
    * System calculates: $CurrentDate + Duration = EndDate$.
4. Save Action:
    * Create a new Client document.
    * Create the first entry in membershipHistory.
    * Create the first entry in paymentHistory.

3. The Logic Flowchart for AI Models
You can paste this description directly into an AI tool to explain how "Expiry" should work:
Logic: Membership Expiry & Status
1. Check-in Request: When a client arrives, search membershipHistory for the record with the latest endDate.
2. Condition 1: If endDate < today → Change Status to "Expired" and deny entry.
3. Condition 2: If endDate > today AND isTrial is true → Status is "Trial".
4. Condition 3: If endDate > today AND isTrial is false → Status is "Active".



{
  "planId": "PLAN_ID_123",
  "totalAmount": 5000,
  "primaryMember": {
    "name": "John Doe",
    "phone": "9876543210"
  },
  "dependents": [
    { "name": "Jane Doe", "phone": "9876543211", "isExisting": false },
    { "clientId": "EXISTING_ID_456", "isExisting": true }
  ]
}