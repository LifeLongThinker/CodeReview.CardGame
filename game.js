/*--------------------------------------------
  WEB LOGIC
---------------------------------------------*/
/**
 * This is the base API client. It knows about REST and basic API stuff but NOTHING at all about
 * the deck of cards API.
 */
class APIClient {
  constructor(baseUrl)
  {
    this._baseUrl = baseUrl;
  }

  async fetchAsJson(endpoint)
  {
    const url = this.assembleUrl(endpoint);
    const res = await window.fetch(url);
    return await res.json();
  }
  assembleUrl(endpoint)
  {
    return `${this._baseUrl}${endpoint}`;
  }
}

/*--------------------------------------------
  CORE BUSINESS LOGIC
---------------------------------------------*/
/**
 * This is the API client that knows about the deck of cards API but is still oblivious of
 * our concrete game (e.g. how many decks it uses or how many card it draws.)
 */
class DeckOfCardsClient extends APIClient
{
  constructor(baseUrl = "https://deckofcardsapi.com/api/")
  {
    super(baseUrl);
  }

  static async getNewShuffledDeck(count)
  {
    const client = new DeckOfCardsClient();
    const data = await client.fetchAsJson(`deck/new/shuffle/?deck_count=${Number(count)}`);
    
    return new Deck(client, data.deck_id);
  }

  async drawFromDeck(deck, count)
  {
    const cardsJson = await this.fetchAsJson(`deck/${deck.id}/draw/?count=${Number(count)}`);
    return cardsJson.cards.map(c => Card.fromJson(c, deck));
  }
  async drawFromPile(pile, count)
  {
    const cardsJson = await this.fetchAsJson(`deck/${pile.deck.id}/pile/${pile.name}/draw/?count=${Number(count)}`);
    return cardsJson.cards.map(c => Card.fromJson(c, pile.deck));
  }
  async createPileFromCards(pileName, cards)
  {
    // TODO: validate cards; make sure they are all from the same deck
    const deck = cards[0].deck;
    const cardsParam = cards.map(c => c.code).join(',');
    const pileJson = await this.fetchAsJson(`/deck/${deck.id}/pile/${pileName}/add/?cards=${cardsParam}`);
    
    return new Pile(this, deck, pileName, pileJson.piles[pileName].remaining);
  }
}

class Deck 
{
  constructor(client, deckId)
  {
    this._client = client;
    this.id = deckId;
  }

  async draw(count)
  {
    return await this._client.drawFromDeck(this, count);
  }
  
  async createFromCards(name, cards)
  {
    return await this._client.createPileFromCards(name, cards);
  }
}
class Card
{
  constructor(deck, code, imageUrl, value, suit)
  {
    this.deck = deck;
    this.code = code;
    this.imageUrl = imageUrl;
    this.value = value;
    this.suit = suit;
    this.numericValue = Card.getNumericValue(value);
  }
  
  // TODO: add support for comparison operators (<, >, ==, etc.)
  beats(otherCard)
  {
    return this.numericValue > otherCard.numericValue;
  }

  static fromJson(json, deck)
  {
    return new Card(deck, json.code, json.image, json.value, json.suit);
  }
  static getNumericValue(cardValue)
  {
    const numericCardValue = Number(cardValue);

    if(numericCardValue)
    {
      return numericCardValue;
    }

    const facesToNumericValues = 
    {
      "JACK": 11,
      "QUEEN": 12,
      "KING": 13,
      "ACE": 14
    };

    return facesToNumericValues[cardValue];
  }
}
class Pile
{
  constructor(client, deck, name, remaining)
  {
    this._client = client;
    this.deck = deck;
    this.name = name;
    this.remaining = remaining;
  }

  async draw()
  {
    const cards = await this._client.drawFromPile(this, 1);
    return cards[0];
  }
}

const CardGameRules = 
{
  decks: 1,
  cardsPerDraw: 52
}
class CardGame
{
  constructor(deck)
  {
    this._deck = deck;
  }

  static async createNew()
  {
    const deck = await DeckOfCardsClient.getNewShuffledDeck(CardGameRules.decks);
    const game = new CardGame(deck);

    await game.drawCardsAndSplitIntoPiles()

    return game;
  }

  async drawCardsAndSplitIntoPiles()
  {
    const cards = await this._deck.draw(CardGameRules.cardsPerDraw);

    // TODO: remove duplication
    const cardsForPile0 = cards.filter((value, index, array) => {
      return index % 2 == 0;
    });
    const cardsForPile1 = cards.filter((value, index, array) => {
      return index % 2 == 1;
    });

    this.humanPile = await this._deck.createFromCards("human", cardsForPile0);
    this.computerPile = await this._deck.createFromCards("computer", cardsForPile1);
  }
}

/*--------------------------------------------
  UI LOGIC
---------------------------------------------*/
class Element
{
  constructor(id)
  {
    this.element = document.getElementById(id);
  }

  hide()
  {
    this.element.classList.add('hidden');
  }
  show()
  {
    this.element.classList.remove('hidden');
  }
}

class Button extends Element
{
  constructor(id, onClick)
  {
    super(id);
    this.element.addEventListener('click', onClick);
  }

  disable()
  {
    this.element.setAttribute('disabled', 'disabled');
  }
  enable()
  {
    this.element.removeAttribute('disabled');
  }
}

class CardFace extends Element
{
  constructor(id)
  {
    super(id);
  }

  showCard(card)
  {
    this.element.setAttribute('src', card.imageUrl);
    this.show();
  }
}

class Heading extends Element
{
  constructor(id)
  {
    super(id);
  }

  get text()
  {
    return this.element.innerText;
  }
  set text(value)
  {
    this.element.innerText = value;
  }

  showText(text)
  {
    this.text = text;
    this.show();
  }
  clear()
  {
    this.text = "";
    this.hide();
  }
}

class GameUI
{
  constructor()
  {
    this.startGameButton = new Button('startGame', this.startNewGame.bind(this));
    this.drawCardsButton = new Button('drawCards', this.drawCards.bind(this));
    this.computerCardFace = new CardFace('computerCardFace');
    this.humanCardFace = new CardFace('humanCardFace');
    this.resultHeading = new Heading('result');

    this.clearGameState();
  }
  
  clearGameState()
  {
    this.game = null;
    this.drawCardsButton.hide();
    this.computerCardFace.hide();
    this.humanCardFace.hide();
    this.resultHeading.hide();
  }
  startNewGame()
  {
    console.log("Starting a new round...");

    this.startGameButton.hide();

    // TODO: add error handling
    CardGame.createNew()
      .then(game => {
        this.game = game;
        this.drawCardsButton.show();
      }).catch(err => {
        console.error(err);
        this.startGameButton.show();
      });
  }
  drawCards()
  {
    this.drawCardsButton.disable();
    this.resultHeading.clear();

    let humanCard = null;
    let computerCard = null;

    // TODO: add error handling
    this.game.humanPile.draw()
      .then((card) => humanCard = card)
      .then(() => this.game.computerPile.draw())
      .then((card) => computerCard = card)
      .then(() => {
        this.showCardsDrawnAndEvaluate(humanCard, computerCard);
      }).finally(() => {
        this.drawCardsButton.enable();
      });
  }
  showCardsDrawnAndEvaluate(humanCard, computerCard)
  {
    this.computerCardFace.showCard(computerCard);
    this.humanCardFace.showCard(humanCard);
    this.evaluateCards(humanCard, computerCard)
  }
  evaluateCards(humanCard, computerCard)
  {
    let text = "";

    if(humanCard.beats(computerCard))
    {
      text = "Human wins!";
    }
    else if(computerCard.beats(humanCard))
    {
      text = "Computer wins!";
    }
    else
    {
      text = "WAR!";
      // TODO: run Extra War Battle
    }

    this.resultHeading.showText(text);
  }
}


// This is where the entire game starts
var ui = new GameUI();

// TODO: add "New Game" button
// TODO: add Persistence (LocalStorage) and allow continuing game after the browser window was closed