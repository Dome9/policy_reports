
## Requirements ##
* NodeJs stable version 4.3.2 or later. 
( Can be Download <a href="https://nodejs.org">here</a> )

## Installation ##
1 Clone this repo into your local machine

```git clone https://github.com/Dome9/policy_reports.git```

2 Navigate to the policy reports folder:

```cd policy_reports``` 

3 Install the tool's dependencies:

```npm install ```

## How to run ##

1. Using console, navigate to  policy_reports directory.

2. run the command ```node policyGenerator.js --help``` to understand the command line parameters

3. If running the tools without specifying (Dome9) username / password - the tool will prompt for them.

### Command Line options ###

* -r or --report REPORT_TYPE for choosing the report type. Currently the supported reports type are 'instances', 'securityGroups', 'rds', 'nacl' and 'elbs' (instances is the default report).
* -f <PATH> or --file PATH for writing the report to file instead of to the standard output.
* -u or --username USERNAME : your Dome9 username (email)
* -p or --password PASSWORD : your Dome9 password
* -m or --mfa MFA : For users with MFA. 


An example of how to generate report to file:
```node policyGenerator.js  -u me@acme.com -p mypass -f myreport.csv```

