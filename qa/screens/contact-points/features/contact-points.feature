Feature: contact-points Screen

  As a user
  I want to interact with the contact-points screen
  So that I can accomplish my tasks
  Path: C:/Program Files/Git/vi/contact-points

  Background:
    Given User is on [contact-points] page

  @high
  Scenario: Sample scenario for contact-points
    When User click [element] button
    Then User see [result] text with {{success}}
