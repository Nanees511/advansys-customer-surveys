# Advansys Dynamic Survey Site

Upload the files in this folder to the root of your GitHub repository.

Test examples:
- `/?survey=mechanical-project&token=test123`
- `/?survey=controls-project&token=test123`
- `/?survey=software-project&token=test123`
- `/?survey=ba-project&token=test123`
- `/?survey=ba-support-project&token=test123`
- `/?survey=mechanical-engineer&token=test123`
- `/?survey=controls-engineer&token=test123`
- `/?survey=procurement-engineer&token=test123`
- `/?survey=ba-outsourcing-engineer&token=test123`

Final production links should use only:
- `/?token=<SurveyToken>`

After wiring, Power Automate will load the correct survey type and project/engineer details from SharePoint using the token.
