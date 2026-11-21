# How bookings work

- A booking covers one or more apartments from the arrival day to the departure day. The
  departure day is free for the next arrival.
- A request from the website is `pending` and holds its dates. The owner confirms or
  declines it; the guest is told by e-mail in their language.
- The availability check and the insert run in one database transaction that first locks
  the apartments, so two people cannot book the same apartment for overlapping dates.
- Flat type, floor and equipment come from fixed lists (`api/src/apartments/apartment-options.ts`
  and `web/src/app/models/apartment-options.model.ts`, kept in step). Labels, the
  description and the other texts are free and bilingual.
- Prices are optional. An apartment without a nightly price shows "price on request", and
  the owner sets the total when confirming.
