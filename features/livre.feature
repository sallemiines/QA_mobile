Feature: To test the Electre application

@ElectreScenario
Scenario: Electre application
Given I am on my app
When I click on menu button
Then I click on Ma selection button
Then the result "LIVRES PRÈS DE VOUS" should be displayed