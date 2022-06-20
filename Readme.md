# Making the Card Game more OOP-like

## Step 1: Finding the Participants (Collaborators) and their Responsibilities

Having a look at the current codebase, we can clearly make out the following collaborators and their responsibilities (based on the Principles of "Separation of Concerns" and "Single Responsibility"):

+ PROBLEM DOMAIN
    + **Game**: general game logic that needs to be handled (e.g. game state, creating a new game, etc.)
    + **Player**: Everything related to the human or computer player
    + **Deck** and **Card**: Everything related to cards
+ SOLUTION DOMAIN
    + **DeckOfCardsAPIClient**: A client that handles the HTTP requests to the deckofcardsapi.com API
    + **UI Elements**: Wrapping the UI behind UI-related classes
    + **Persistence**: Wrapping the LocalStorage logic in its own class so it handles persistence for us

## Step 2: Modelling the Participants

## Step 3: Implementing the Participants in their Layers
+ beginning with the Web Logic
+ then core business logic
+ finally, hooking everything up in the UI logic

## TODO
+ See ToDo items in source