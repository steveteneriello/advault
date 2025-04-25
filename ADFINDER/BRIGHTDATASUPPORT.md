Subject: Unable to Extract Google Ads with Residential Proxy - Technical Support Needed

Dear Bright Data Support Team,

I have configured an API for residential proxy use in the US. My goal is to search Google for commercial keywords and scrape Google Ads live based on geolocation. I'm encountering several issues that I hope you can help resolve.

Current Issues:

No Google Ads appearing in results: I've validated and whitelisted my account and performed multiple tests. While I can confirm that my requests are coming from the target regions, no Google Ads appear in the results.
HTML-only responses: I'm unable to extract JSON data - only receiving HTML responses, which makes parsing more difficult.
Comparison with other services: I've performed side-by-side tests with OxyLabs proxies which successfully return ads, while my Bright Data implementation doesn't.
What I've already tried:

Switching between Mozilla and Chrome user agents
Testing the implementation half a dozen times with different configurations
Verifying that my location targeting is working correctly (I can confirm the proxy is correctly routing through the target location)
Business Context:
We run a Google Ads agency and need to schedule live scrapes of the market at specific times throughout the day. This data feeds into our database for analysis. I initially tried the SerpAPI but found that when searching for Los Angeles, for example, my search results would come from Missouri, and I didn't receive any ads in any tests.

Technical Implementation:
I'm using Node.js with the following credentials in my implementation:

BRIGHT_DATA_USER: hl_45067457
BRIGHT_DATA_ZONE: residential
BRIGHT_DATA_PASSWORD: ob9i9f9ad65g
BRIGHT_DATA_HOST: brd.superproxy.io
BRIGHT_DATA_PORT: 33335
I've attached my full Node.js code for your review. We prefer to develop a server-side app to feed data directly into our database.

Could you please advise on:

How to properly configure the proxy to receive Google Ads in the results
Any specific headers or parameters needed to mimic authentic browser behavior
Best practices for location targeting with your residential proxies
Any rate limiting or other considerations I should be aware of
Thank you for your assistance. This functionality is critical for our business operations.

