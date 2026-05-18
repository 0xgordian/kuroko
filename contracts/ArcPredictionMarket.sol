// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ArcPredictionMarket {
    address public owner;
    uint256 public marketCounter;

    struct Market {
        uint256 id;
        string question;
        uint256 resolutionTime;
        bool resolved;
        bool outcome; // true = YES, false = NO
        uint256 yesPool;
        uint256 noPool;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesShares;
    mapping(uint256 => mapping(address => uint256)) public noShares;

    event MarketCreated(uint256 indexed id, string question, uint256 resolutionTime);
    event SharesPurchased(uint256 indexed marketId, address indexed buyer, bool side, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);

    constructor() {
        owner = msg.sender;
    }

    function createMarket(string calldata question, uint256 resolutionTime) external {
        require(resolutionTime > block.timestamp, "Resolution must be in future");
        marketCounter++;
        markets[marketCounter] = Market({
            id: marketCounter,
            question: question,
            resolutionTime: resolutionTime,
            resolved: false,
            outcome: false,
            yesPool: 0,
            noPool: 0
        });
        emit MarketCreated(marketCounter, question, resolutionTime);
    }

    function buyShares(uint256 marketId, bool side) external payable {
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");
        require(!m.resolved, "Market already resolved");
        require(msg.value > 0, "Must send USDC");

        if (side) {
            m.yesPool += msg.value;
            yesShares[marketId][msg.sender] += msg.value;
        } else {
            m.noPool += msg.value;
            noShares[marketId][msg.sender] += msg.value;
        }

        emit SharesPurchased(marketId, msg.sender, side, msg.value);
    }

    function resolveMarket(uint256 marketId, bool outcome) external {
        require(msg.sender == owner, "Only owner");
        Market storage m = markets[marketId];
        require(!m.resolved, "Already resolved");
        require(block.timestamp >= m.resolutionTime, "Too early to resolve");

        m.resolved = true;
        m.outcome = outcome;
        emit MarketResolved(marketId, outcome);
    }

    function claimPayout(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.resolved, "Not resolved yet");

        uint256 payout = 0;
        if (m.outcome) {
            payout = yesShares[marketId][msg.sender];
            yesShares[marketId][msg.sender] = 0;
        } else {
            payout = noShares[marketId][msg.sender];
            noShares[marketId][msg.sender] = 0;
        }

        require(payout > 0, "No shares to claim");
        (bool sent,) = payable(msg.sender).call{value: payout}("");
        require(sent, "Transfer failed");
    }
}
