# The run log

INVENTED TEST FIXTURE.

The order import runs every 15 minutes from 07:00 to 19:00 on weekdays. Each run appends one line to `logs/runs.log`:

    2027-02-01T09:15 import ok orders=3 exceptions=1

The invoice push runs once a day at 18:00 and appends to `logs/invoice-push.log`. A failed push is retried 3 times, 5 minutes apart, then the `invoice_push_failed` alert fires.

The run log keeps 90 days of runs, as the operations manager asked.
