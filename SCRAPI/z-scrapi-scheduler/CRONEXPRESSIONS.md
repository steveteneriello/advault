Understanding Cron Expressions
Cron expressions are a way to schedule recurring tasks. In the context of Oxylabs Scheduler, they determine when your scraping jobs will run. A cron expression consists of five fields (with an optional sixth field) that specify when the task should run:
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
 │ │ │ │ │
 * * * * *
Common Cron Patterns
Here are some common cron patterns you might find useful:

0 0 * * * - Run once a day at midnight
0 12 * * * - Run once a day at noon
0 */6 * * * - Run every 6 hours (at 0:00, 6:00, 12:00, 18:00)
0 0 * * 0 - Run once a week on Sunday at midnight
0 0 1 * * - Run once a month on the first day at midnight
*/15 * * * * - Run every 15 minutes

Special Characters

* - Any value (wildcard)
, - Value list separator (e.g., 1,3,5)
- - Range of values (e.g., 1-5)
/ - Step values (e.g., */5 means "every 5 units")

Examples Explained

0 12 * * * - This runs at 12:00 PM (noon) every day

0 - At minute 0
12 - At hour 12 (noon)
* - Every day of the month
* - Every month
* - Every day of the week


30 9 * * 1-5 - This runs at 9:30 AM from Monday to Friday

30 - At minute 30
9 - At hour 9 (9 AM)
* - Every day of the month
* - Every month
1-5 - Monday through Friday


0 0 1,15 * * - This runs at midnight on the 1st and 15th of each month

0 - At minute 0
0 - At hour 0 (midnight)
1,15 - On the 1st and 15th days
* - Every month
* - Every day of the week


*/10 * * * * - This runs every 10 minutes

*/10 - Every 10th minute (0, 10, 20, 30, 40, 50)
* - Every hour
* - Every day of the month
* - Every month
* - Every day of the week



For scheduling scraping jobs with Oxylabs, you'll typically want to use less frequent schedules like daily, weekly, or monthly to avoid hitting rate limits and to manage your usage efficiently.