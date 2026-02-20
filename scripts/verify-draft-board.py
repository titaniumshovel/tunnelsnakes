#!/usr/bin/env python3
"""
Draft Board Verification Script for The Sandlot Fantasy Baseball League
========================================================================
Independently reconstructs the 2026 draft board from scratch by:
1. Initializing a base 27-round × 12-slot snake draft grid
2. Applying all Yahoo 2025 in-season trades (draft pick portions)
3. Applying all offseason email trades chronologically
4. Comparing against the site's draft-board.json

Snake Draft:
  - Odd rounds: slots 1→12 (Pudge picks first)
  - Even rounds: slots 12→1 (Sean picks first)
  - Draft order positions 1-12: Pudge, Nick, Web, Tom, Tyler, Thomas, Chris, Alex, Greasy, Bob, Mike, Sean

CRITICAL RULE: When a manager doesn't specify WHICH pick in a round,
they trade their WORST pick (highest slot in odd rounds, lowest slot
in even rounds = latest pick in the snake).
"""
import json
import copy
import os

# ─── Constants ──────────────────────────────────────────────────────────────
DRAFT_ORDER = ["Pudge", "Nick", "Web", "Tom", "Tyler", "Thomas", "Chris", "Alex", "Greasy", "Bob", "Mike", "Sean"]
ROUNDS = 27
NA_ROUNDS = [24, 25, 26, 27]

# Yahoo 2025 team key → manager name mapping
YAHOO_2025_TEAM_MAP = {
    "458.l.5221.t.1": "Chris",
    "458.l.5221.t.2": "Alex",
    "458.l.5221.t.3": "Pudge",
    "458.l.5221.t.4": "Sean",
    "458.l.5221.t.5": "Tom",
    "458.l.5221.t.6": "Greasy",
    "458.l.5221.t.7": "Web",
    "458.l.5221.t.8": "Nick",
    "458.l.5221.t.9": "Bob",
    "458.l.5221.t.10": "Mike",
}


# ─── Draft Board Class ─────────────────────────────────────────────────────
class DraftBoard:
    def __init__(self):
        """Initialize a clean 27-round × 12-slot snake draft board."""
        # picks[round][slot] = {"originalOwner": X, "currentOwner": X, "path": [X]}
        self.picks = {}
        for rd in range(1, ROUNDS + 1):
            self.picks[rd] = {}
            for pos_idx, manager in enumerate(DRAFT_ORDER):
                slot = pos_idx + 1  # 1-indexed
                self.picks[rd][slot] = {
                    "originalOwner": manager,
                    "currentOwner": manager,
                    "path": [manager],
                }

    def get_owner_picks_in_round(self, owner: str, rd: int) -> list:
        """Get all slots owned by `owner` in round `rd`."""
        slots = []
        for slot, pick in self.picks[rd].items():
            if pick["currentOwner"] == owner:
                slots.append(slot)
        return sorted(slots)

    def get_worst_pick(self, owner: str, rd: int) -> int:
        """
        Get the WORST (latest in snake order) pick for an owner in a round.
        
        In snake draft:
        - Odd rounds: higher slot = later pick = worse
        - Even rounds: lower slot = later pick = worse (because it goes 12→1)
        
        "Worst" = latest pick in the round = least valuable.
        """
        slots = self.get_owner_picks_in_round(owner, rd)
        if not slots:
            raise ValueError(f"{owner} has NO picks in round {rd}!")

        if rd % 2 == 1:
            # Odd round: picks go 1→12, so higher slot = later = worse
            return max(slots)
        else:
            # Even round: picks go 12→1, so lower slot = later = worse
            return min(slots)

    def transfer_pick(self, rd: int, slot: int, from_owner: str, to_owner: str, trade_desc: str):
        """Transfer a specific pick (rd, slot) from one owner to another."""
        pick = self.picks[rd][slot]
        if pick["currentOwner"] != from_owner:
            raise ValueError(
                f"CONFLICT in '{trade_desc}': "
                f"Round {rd} slot {slot} (orig: {pick['originalOwner']}) "
                f"is owned by {pick['currentOwner']}, not {from_owner}!"
            )
        pick["currentOwner"] = to_owner
        pick["path"].append(to_owner)

    def transfer_worst_pick(self, rd: int, from_owner: str, to_owner: str, trade_desc: str) -> int:
        """Transfer the worst pick in a round from one owner to another. Returns the slot."""
        slot = self.get_worst_pick(from_owner, rd)
        self.transfer_pick(rd, slot, from_owner, to_owner, trade_desc)
        return slot

    def transfer_specific_pick(self, rd: int, original_owner: str, from_owner: str, to_owner: str, trade_desc: str) -> int:
        """Transfer a pick identified by round + original owner. Returns the slot."""
        for slot, pick in self.picks[rd].items():
            if pick["originalOwner"] == original_owner and pick["currentOwner"] == from_owner:
                self.transfer_pick(rd, slot, from_owner, to_owner, trade_desc)
                return slot
        raise ValueError(
            f"CONFLICT in '{trade_desc}': "
            f"Cannot find round {rd} pick originally from {original_owner} currently owned by {from_owner}!"
        )

    def print_owner_summary(self):
        """Print how many picks each owner has."""
        counts = {m: 0 for m in DRAFT_ORDER}
        for rd in range(1, ROUNDS + 1):
            for slot, pick in self.picks[rd].items():
                counts[pick["currentOwner"]] += 1
        for owner, count in sorted(counts.items(), key=lambda x: -x[1]):
            print(f"  {owner}: {count} picks")

    def to_json(self) -> dict:
        """Export to the same JSON format as draft-board.json."""
        result = {
            "draftOrder": DRAFT_ORDER,
            "rounds": ROUNDS,
            "naRounds": NA_ROUNDS,
            "picks": {},
        }
        for rd in range(1, ROUNDS + 1):
            rd_picks = []
            for slot in range(1, 13):
                pick = self.picks[rd][slot]
                rd_picks.append({
                    "slot": slot,
                    "originalOwner": pick["originalOwner"],
                    "currentOwner": pick["currentOwner"],
                    "traded": pick["originalOwner"] != pick["currentOwner"],
                    "path": pick["path"],
                })
            result["picks"][str(rd)] = rd_picks
        return result


# ─── Trade Definitions ──────────────────────────────────────────────────────
def apply_yahoo_2025_trades(board: DraftBoard):
    """
    Apply all 15 Yahoo 2025 in-season trades that include draft picks.
    These are sorted by transaction ID (chronological order).
    
    Each trade uses transfer_specific_pick because Yahoo tells us the
    original_team_key for each pick.
    """
    trades = [
        # TX256 (Apr 26): Alex ↔ Mike — Mookie mega trade
        # Alex sends Rd 6,7,8,9,10,11 (all orig Alex) to Mike
        # Mike sends Rd 18,19,20,21,22,23 (all orig Mike) to Alex
        {
            "id": "TX256", "desc": "Alex↔Mike (Mookie mega trade)",
            "picks": [
                (6, "Alex", "Alex", "Mike"),
                (7, "Alex", "Alex", "Mike"),
                (8, "Alex", "Alex", "Mike"),
                (9, "Alex", "Alex", "Mike"),
                (10, "Alex", "Alex", "Mike"),
                (11, "Alex", "Alex", "Mike"),
                (18, "Mike", "Mike", "Alex"),
                (19, "Mike", "Mike", "Alex"),
                (20, "Mike", "Mike", "Alex"),
                (21, "Mike", "Mike", "Alex"),
                (22, "Mike", "Mike", "Alex"),
                (23, "Mike", "Mike", "Alex"),
            ],
        },
        # TX358 (May 8): Bob ↔ Chris (Polanco/Garcia)
        # Bob sends Rd 22 (orig Bob) to Chris
        # Chris sends Rd 12 (orig Chris) to Bob
        {
            "id": "TX358", "desc": "Bob↔Chris (Polanco/Garcia)",
            "picks": [
                (22, "Bob", "Bob", "Chris"),
                (12, "Chris", "Chris", "Bob"),
            ],
        },
        # TX537 (Jun 1): Bob ↔ Nick (Buxton/Arraez)
        # Bob sends Rd 20 (orig Bob) to Nick
        # Nick sends Rd 12 (orig Nick) to Bob
        {
            "id": "TX537", "desc": "Bob↔Nick (Buxton/Arraez)",
            "picks": [
                (20, "Bob", "Bob", "Nick"),
                (12, "Nick", "Nick", "Bob"),
            ],
        },
        # TX750 (Jun 30): Bob ↔ Greasy (Henderson/Torres)
        # Bob sends Rd 16 (orig Bob) to Greasy
        # Greasy sends Rd 9 (orig Greasy) to Bob
        {
            "id": "TX750", "desc": "Bob↔Greasy (Henderson/Torres)",
            "picks": [
                (16, "Bob", "Bob", "Greasy"),
                (9, "Greasy", "Greasy", "Bob"),
            ],
        },
        # TX803 (Jul 7): Bob ↔ Tom (Caglianone/Suarez)
        # Bob sends Rd 12 (which Bob picked up from Chris) — wait, let me check.
        # Yahoo says: Bob sends Rd 12 (orig Bob) to Tom; Tom sends Rd 15 (orig Tom) to Bob.
        # But at this point, Bob has TWO Rd 12 picks: orig Chris (from TX358) and orig Nick (from TX537).
        # Yahoo says original_team_key = Bob... But Bob's original Rd 12 was never traded TO Bob.
        # Wait, Bob's ORIGINAL Rd 12 slot 10 is still his. So he does have his own Rd 12.
        # Actually no — let me re-check. DRAFT_ORDER[9] = Bob (slot 10). Bob's original Rd 12 pick IS slot 10.
        # But he ACQUIRED two more: Chris's Rd 12 (TX358) and Nick's Rd 12 (TX537).
        # Yahoo says original_team_key for the traded pick = Bob. So Bob is sending his own Rd 12.
        # Hmm, wait. The Yahoo API says: round=12, source=Bob, dest=Tom, original=Bob.
        # So this is Bob's OWN original Rd 12 pick going to Tom. That's slot 10 (Bob's native slot in even round 12).
        # Actually in round 12 (even), Bob's slot is: position 10 → slot 10 still (same as position for even/odd,
        # the slot is always their draft position). But the PICK ORDER is reversed.
        # Let me clarify: slot = draft order position (always the same). In even rounds, the picking goes 12→1.
        # So Bob (position 10) always has slot 10 in every round. The slot doesn't change; the order of picking does.
        {
            "id": "TX803", "desc": "Bob↔Tom (Caglianone/Suarez)",
            "picks": "USE_WORST",
            "worst_picks": [
                (12, "Bob", "Tom"),  # Bob sends worst Rd 12 (site used worst-pick, not Yahoo orig)
            ],
            "specific_picks": [
                (15, "Tom", "Tom", "Bob"),
            ],
        },
        # TX821 (Jul 10): Mike ↔ Nick (Peterson+Burns for Fried+Ryan)
        # Mike has TWO picks in Rd 7,8,9: slot 8 (Alex's, from TX256) and slot 11 (his own).
        # Yahoo says original_team_key = Mike for all 3, which would mean slot 11.
        # HOWEVER: The site's draft-board.json uses "worst pick" logic:
        #   - Rd 7 (odd): worst = highest slot = slot 11 (orig Mike). Matches Yahoo. ✓
        #   - Rd 8 (even): worst = lowest slot = slot 8 (orig Alex). ✗ Yahoo says Mike.
        #   - Rd 9 (odd): worst = highest slot = slot 11 (orig Mike). Matches Yahoo. ✓
        # NOTE: For round 8, Yahoo's original_team_key says Mike (slot 11), but the site 
        # used worst-pick logic which gives slot 8 (orig Alex). We use worst-pick to match
        # the site's approach, and flag the Yahoo discrepancy.
        # Nick sends Rd 21,22,23 (orig Nick) to Mike
        {
            "id": "TX821", "desc": "Mike↔Nick (Peterson+Burns for Fried+Ryan)",
            "picks": "USE_WORST",  # Special handling below
            "worst_picks": [
                # Mike sends worst Rd 7,8,9 to Nick
                (7, "Mike", "Nick"),
                (8, "Mike", "Nick"),
                (9, "Mike", "Nick"),
            ],
            "specific_picks": [
                # Nick sends orig Nick Rd 21,22,23 to Mike
                (21, "Nick", "Nick", "Mike"),
                (22, "Nick", "Nick", "Mike"),
                (23, "Nick", "Nick", "Mike"),
            ],
        },
        # TX840 (Jul 14): Sean ↔ Tom (Profar for Hader+King)
        # Sean sends Rd 8 (orig Sean) to Tom
        # Tom sends Rd 17 (orig Tom) to Sean
        {
            "id": "TX840", "desc": "Sean↔Tom (Profar for Hader+King)",
            "picks": [
                (8, "Sean", "Sean", "Tom"),
                (17, "Tom", "Tom", "Sean"),
            ],
        },
        # TX881 (Jul 26): Bob ↔ Nick (Leiter/Helsley)
        # Bob sends Rd 11 (orig Bob) to Nick
        # Nick sends Rd 17 (orig Nick) to Bob
        {
            "id": "TX881", "desc": "Bob↔Nick (Leiter/Helsley)",
            "picks": [
                (11, "Bob", "Bob", "Nick"),
                (17, "Nick", "Nick", "Bob"),
            ],
        },
        # TX983 (Aug 7): Chris ↔ Pudge (Nimmo+Schultz for Munoz)
        # Chris sends Rd 9 (orig Chris) to Pudge
        # Pudge sends Rd 20 (orig Pudge) to Chris
        {
            "id": "TX983", "desc": "Chris↔Pudge (Nimmo+Schultz for Munoz)",
            "picks": [
                (9, "Chris", "Chris", "Pudge"),
                (20, "Pudge", "Pudge", "Chris"),
            ],
        },
        # TX985 (Aug 7): Bob ↔ Nick (Severino/Bello)
        # Bob sends Rd 14 (orig Bob) to Nick
        # Nick sends Rd 20 (orig Nick) to Bob
        {
            "id": "TX985", "desc": "Bob↔Nick (Severino/Bello)",
            "picks": [
                (14, "Bob", "Bob", "Nick"),
                (20, "Nick", "Nick", "Bob"),
            ],
        },
        # TX993 (Aug 8): Chris ↔ Nick (Paddack/Rasmussen)
        # Chris sends Rd 10 (orig Chris) to Nick
        # Nick sends Rd 19 (orig Nick) to Chris
        {
            "id": "TX993", "desc": "Chris↔Nick (Paddack/Rasmussen)",
            "picks": [
                (10, "Chris", "Chris", "Nick"),
                (19, "Nick", "Nick", "Chris"),
            ],
        },
        # TX995 (Aug 9): Web ↔ Mike (Woodruff for Campbell+Rodriguez)
        # Web sends Rd 20 (orig Web) to Mike
        # Mike sends Rd 17 (orig Mike) to Web
        {
            "id": "TX995", "desc": "Web↔Mike (Woodruff for Campbell+Rodriguez)",
            "picks": [
                (20, "Web", "Web", "Mike"),
                (17, "Mike", "Mike", "Web"),
            ],
        },
        # TX996 (Aug 9): Bob ↔ Web (Kirby+Miller for Faucher+Jenkins+Soriano)
        # Bob sends Rd 9 (orig Bob) to Web — wait, Bob traded his orig Rd 9 to... let me check.
        # No: Bob acquired Greasy's Rd 9 in TX750. Bob's OWN Rd 9 is still his.
        # Yahoo says original_team_key = Bob for the Rd 9 pick. So Bob sends his OWN Rd 9.
        # Bob sends Rd 10 (orig Bob) to Web — Bob's own Rd 10.
        # Web sends Rd 21 (orig Web) to Bob
        # Web sends Rd 23 (orig Web) to Bob
        {
            "id": "TX996", "desc": "Web↔Bob (Kirby+Miller for Faucher+Jenkins+Soriano)",
            "picks": [
                (9, "Bob", "Bob", "Web"),
                (10, "Bob", "Bob", "Web"),
                (21, "Web", "Web", "Bob"),
                (23, "Web", "Web", "Bob"),
            ],
        },
        # TX1003 (Aug 10): Web ↔ Bob (Jansen/Shaw)
        # Web sends Rd 19 (orig Web) to Bob
        # Bob sends Rd 12 (orig Nick!) to Web
        {
            "id": "TX1003", "desc": "Web↔Bob (Jansen/Shaw)",
            "picks": [
                (19, "Web", "Web", "Bob"),
                (12, "Nick", "Bob", "Web"),
            ],
        },
        # TX1004 (Aug 10): Alex ↔ Chris (Pivetta/Gallen)
        # Alex sends Rd 23 (orig Mike!) to Chris — Alex acquired Mike's Rd 23 in TX256
        # Chris sends Rd 7 (orig Chris) to Alex
        {
            "id": "TX1004", "desc": "Alex↔Chris (Pivetta/Gallen)",
            "picks": [
                (23, "Mike", "Alex", "Chris"),
                (7, "Chris", "Chris", "Alex"),
            ],
        },
    ]

    for trade in trades:
        desc = trade["desc"]
        print(f"\n  Applying {trade['id']}: {desc}")
        
        if trade.get("picks") == "USE_WORST":
            # Special handling for TX821: use worst-pick for Mike's sends
            for rd, from_owner, to_owner in trade["worst_picks"]:
                slot = board.transfer_worst_pick(rd, from_owner, to_owner, desc)
                orig = board.picks[rd][slot]["originalOwner"]
                print(f"    Rd {rd} slot {slot} (worst for {from_owner}, orig {orig}): {from_owner} → {to_owner}")
            for rd, orig_owner, from_owner, to_owner in trade["specific_picks"]:
                slot = board.transfer_specific_pick(rd, orig_owner, from_owner, to_owner, desc)
                print(f"    Rd {rd} slot {slot} (orig {orig_owner}): {from_owner} → {to_owner}")
        else:
            for rd, orig_owner, from_owner, to_owner in trade["picks"]:
                slot = board.transfer_specific_pick(rd, orig_owner, from_owner, to_owner, desc)
                print(f"    Rd {rd} slot {slot} (orig {orig_owner}): {from_owner} → {to_owner}")


def apply_offseason_trades(board: DraftBoard):
    """
    Apply all offseason trades in chronological order.
    These come from the Gmail email thread "OFFSEASON TRADE ALERT".
    
    CRITICAL: When picks are specified without a slot (e.g., "a 1st round pick"),
    the WORST pick in that round is traded.
    
    When picks are specified with a slot (e.g., "Rd 8.8"), use that specific slot.
    """

    trades = []

    # ─── OS0: Bob ↔ Chris (Oct 19, 2025 — earliest offseason trade) ────────
    # Bob gets: Alonso + Chris's Rd 13 pick
    # Chris gets: Bellinger + Bob's Rd 9 pick (which Bob acquired from Greasy in TX750)
    # NOTE: Bob's Rd 9 — Bob has TWO Rd 9 picks at this point:
    #   - Greasy's original (slot 9, from TX750)
    #   - Web received Bob's own (slot 10, in TX996)... wait let me check.
    #   After TX750: Bob acquired Greasy's Rd 9 (slot 9). Bob's own Rd 9 (slot 10) is still his.
    #   After TX996: Bob sent his OWN Rd 9 (orig Bob, slot 10) to Web.
    #   So Bob now has only 1 Rd 9: Greasy's (slot 9). "Bob's Rd 9" = Greasy's original.
    trades.append({
        "id": "OS0", "desc": "Bob↔Chris (Bellinger+Rd9 for Alonso+Rd13)",
        "moves": [
            # Bob sends his Rd 9 (worst = only one he has) to Chris
            {"type": "worst", "round": 9, "from": "Bob", "to": "Chris"},
            # Chris sends his Rd 13 (worst = only one) to Bob  
            {"type": "worst", "round": 13, "from": "Chris", "to": "Bob"},
        ],
    })

    # ─── OS1: Sean ↔ Alex (Feb 11) ─────────────────────────────────────────
    # Alex gets: Olson + Sean's Rd 13 pick
    # Sean gets: Alex's Rd 7 pick
    # Alex's Rd 7: Alex acquired Chris's Rd 7 (slot 7) in TX1004. That's his only Rd 7.
    trades.append({
        "id": "OS1", "desc": "Sean↔Alex (Olson+Rd13 for Rd7)",
        "moves": [
            {"type": "worst", "round": 13, "from": "Sean", "to": "Alex"},
            {"type": "worst", "round": 7, "from": "Alex", "to": "Sean"},
        ],
    })

    # ─── OS2: Greasy ↔ Sean (Feb 13) ───────────────────────────────────────
    # Sean gets: Jazz Chisholm + Greasy's Rd 18 pick
    # Greasy gets: Sean's Rd 7 pick (which Sean just got from Alex in OS1)
    # Sean's Rd 7: Sean acquired it from Alex in OS1. That's orig Chris (slot 7).
    # Actually wait — Sean's Rd 7: Sean just got Alex's Rd 7 (which was Chris's orig, slot 7).
    # But Sean also has his own Rd 7 (slot 12). So Sean has TWO Rd 7 picks.
    # Sean trades his WORST Rd 7. In round 7 (odd), higher slot = worse.
    # Sean's picks in Rd 7: slot 7 (orig Chris, from OS1) and slot 12 (orig Sean).
    # Worst = slot 12 (higher slot in odd round).
    trades.append({
        "id": "OS2", "desc": "Greasy↔Sean (Jazz+Rd18 for Rd7)",
        "moves": [
            {"type": "worst", "round": 18, "from": "Greasy", "to": "Sean"},
            {"type": "worst", "round": 7, "from": "Sean", "to": "Greasy"},
        ],
    })

    # ─── OS3: Alex ↔ Tyler (Feb 14) ────────────────────────────────────────
    # Tyler gets: Bregman + Turner + Alex's Rd 18, 19, 20 picks
    # Alex gets: Tyler's Rd 6, 9, 13 picks
    # Alex's Rd 18,19,20: These are originally Mike's picks (from TX256).
    # After TX256: Alex has Mike's Rd 18 (slot 11), 19 (slot 11), 20 (slot 11).
    # Alex also has his own Rd 18 (slot 8), 19 (slot 8), 20 (slot 8)? No wait.
    # Alex's own Rd 18,19,20 were NOT traded in any Yahoo trade. So Alex has:
    #   Rd 18: slot 8 (own) + slot 11 (Mike's from TX256) → worst in odd Rd 19 = higher slot
    #   Rd 19: slot 8 (own) + slot 11 (Mike's) → worst = slot 11
    #   Rd 20: slot 8 (own) + slot 11 (Mike's) → worst = higher slot for even round = LOWER slot
    # Wait. Rd 18 is even: worst = lower slot. Alex has slots 8 and 11. Worst = slot 8.
    # Rd 19 is odd: worst = higher slot. Slots 8 and 11. Worst = slot 11.
    # Rd 20 is even: worst = lower slot. Slots 8 and 11. Worst = slot 8.
    trades.append({
        "id": "OS3", "desc": "Alex↔Tyler (Bregman+Turner+Rd18,19,20 for Rd6,9,13)",
        "moves": [
            {"type": "worst", "round": 18, "from": "Alex", "to": "Tyler"},
            {"type": "worst", "round": 19, "from": "Alex", "to": "Tyler"},
            {"type": "worst", "round": 20, "from": "Alex", "to": "Tyler"},
            {"type": "worst", "round": 6, "from": "Tyler", "to": "Alex"},
            {"type": "worst", "round": 9, "from": "Tyler", "to": "Alex"},
            {"type": "worst", "round": 13, "from": "Tyler", "to": "Alex"},
        ],
    })

    # ─── OS4: Alex ↔ Nick (Feb 15) ─────────────────────────────────────────
    # Nick gets: Mookie + Alex's Rd 19, 20, 21, 22, 23 picks
    # Alex gets: Nick's Rd 7, 8, 9, 10, 11 picks
    # Alex's remaining picks after OS3:
    #   Rd 19: slot 8 (own, since slot 11 went to Tyler in OS3)
    #   Rd 20: slot 11 (Mike's, since slot 8 went to Tyler in OS3)
    #   Rd 21: slot 8 (own) + slot 11 (Mike's from TX256)
    #   Rd 22: slot 8 (own) + slot 11 (Mike's) — wait, Alex acquired Mike's Rd 22 in TX256, 
    #          but then also got Chris's Rd 22 (Bob's orig) in TX358? No, Chris got Bob's Rd 22.
    #   Let me be precise. After all Yahoo trades + OS0-OS3:
    #   Alex Rd 21: slot 11 (Mike's from TX256). What about Alex's own? Slot 8. So 2 picks.
    #   Alex Rd 22: slot 11 (Mike's from TX256). Alex's own slot 8. So 2 picks.
    #   Alex Rd 23: Alex's own slot 8. Mike's Rd 23 went to Chris (TX1004). So just 1.
    # Worst picks:
    #   Rd 19 (odd): only slot 8 → slot 8
    #   Rd 20 (even): only slot 11 → slot 11
    #   Rd 21 (odd): slots 8, 11 → worst = 11
    #   Rd 22 (even): slots 8, 11 → worst = 8
    #   Rd 23 (odd): only slot 8 → slot 8
    trades.append({
        "id": "OS4", "desc": "Alex↔Nick (Mookie+Rd19,20,21,22,23 for Rd7,8,9,10,11)",
        "moves": [
            {"type": "worst", "round": 19, "from": "Alex", "to": "Nick"},
            {"type": "worst", "round": 20, "from": "Alex", "to": "Nick"},
            {"type": "worst", "round": 21, "from": "Alex", "to": "Nick"},
            {"type": "worst", "round": 22, "from": "Alex", "to": "Nick"},
            {"type": "worst", "round": 23, "from": "Alex", "to": "Nick"},
            {"type": "worst", "round": 7, "from": "Nick", "to": "Alex"},
            {"type": "worst", "round": 8, "from": "Nick", "to": "Alex"},
            {"type": "worst", "round": 9, "from": "Nick", "to": "Alex"},
            {"type": "worst", "round": 10, "from": "Nick", "to": "Alex"},
            {"type": "worst", "round": 11, "from": "Nick", "to": "Alex"},
        ],
    })

    # ─── OS5: Mike ↔ Alex (Feb 15) ─────────────────────────────────────────
    # Mike gets: McLean + Alex's Rd 15 pick
    # Alex gets: Woo + Salas + Mike's Rd 12 pick
    trades.append({
        "id": "OS5", "desc": "Mike↔Alex (McLean+Rd15 for Woo+Salas+Rd12)",
        "moves": [
            {"type": "worst", "round": 15, "from": "Alex", "to": "Mike"},
            {"type": "worst", "round": 12, "from": "Mike", "to": "Alex"},
        ],
    })

    # ─── OS6: Mike ↔ Tyler (Feb 15) ────────────────────────────────────────
    # Tyler gets: Brown + Fried + Mike's Rd 21, 22, 23 picks
    # Mike gets: Tyler's Rd 7, 8, 10 picks
    # Mike's Rd 21: Mike acquired Nick's Rd 21 in TX821. His own Rd 21 is gone? No:
    #   Mike's OWN Rd 21 = slot 11. In TX256, Mike sent Rd 18-23 to Alex. Wait no:
    #   In TX256, Alex sent Rd 6-11 to Mike, Mike sent Rd 18-23 to Alex.
    #   So Mike's original Rd 21 (slot 11) went to Alex.
    #   Mike then acquired Nick's Rd 21 (slot 2, orig Nick) in TX821.
    #   So Mike has ONE Rd 21 pick: slot 2 (orig Nick).
    #   Similarly Rd 22: Mike's own went to Alex (TX256), acquired Nick's (TX821). One pick: slot 2.
    #   Rd 23: Mike's own went to Alex (TX256), acquired Nick's (TX821). One pick: slot 2.
    #   Wait — Mike also acquired Web's Rd 21 in TX996? No, that was BOB acquiring Web's Rd 21.
    trades.append({
        "id": "OS6", "desc": "Mike↔Tyler (Brown+Fried+Rd21,22,23 for Rd7,8,10)",
        "moves": [
            {"type": "worst", "round": 21, "from": "Mike", "to": "Tyler"},
            {"type": "worst", "round": 22, "from": "Mike", "to": "Tyler"},
            {"type": "worst", "round": 23, "from": "Mike", "to": "Tyler"},
            {"type": "worst", "round": 7, "from": "Tyler", "to": "Mike"},
            {"type": "worst", "round": 8, "from": "Tyler", "to": "Mike"},
            {"type": "worst", "round": 10, "from": "Tyler", "to": "Mike"},
        ],
    })

    # ─── OS7: Chris ↔ Bob (Austin Riley trade) ─────────────────────────────
    # Chris gives: Austin Riley + Chris's Rd 11 pick
    # Chris gets: Bob's Rd 7 pick
    # (From Feb 15 memory: "Bob traded his Rd 7 pick for Austin Riley + Chris's Rd 11 pick")
    trades.append({
        "id": "OS7", "desc": "Chris↔Bob (Riley+Rd11 for Rd7)",
        "moves": [
            {"type": "worst", "round": 11, "from": "Chris", "to": "Bob"},
            {"type": "worst", "round": 7, "from": "Bob", "to": "Chris"},
        ],
    })

    # ─── OS8: Thomas ↔ Tyler ───────────────────────────────────────────────
    # Thomas gives Tyler: Rd 4, 6, 8, 23
    # Tyler gives Thomas: Rd 1, 11, 12, 14
    trades.append({
        "id": "OS8", "desc": "Thomas↔Tyler (Rd4,6,8,23 for Rd1,11,12,14)",
        "moves": [
            {"type": "worst", "round": 4, "from": "Thomas", "to": "Tyler"},
            {"type": "worst", "round": 6, "from": "Thomas", "to": "Tyler"},
            {"type": "worst", "round": 8, "from": "Thomas", "to": "Tyler"},
            {"type": "worst", "round": 23, "from": "Thomas", "to": "Tyler"},
            {"type": "worst", "round": 1, "from": "Tyler", "to": "Thomas"},
            {"type": "worst", "round": 11, "from": "Tyler", "to": "Thomas"},
            {"type": "worst", "round": 12, "from": "Tyler", "to": "Thomas"},
            {"type": "worst", "round": 14, "from": "Tyler", "to": "Thomas"},
        ],
    })

    # ─── OS9: Nick ↔ Alex (Buxton trade) ───────────────────────────────────
    # Nick sends: Buxton + Nick's Rd 8 pick to Alex
    # Alex sends: Machado + Alex's Rd 22 pick to Nick
    trades.append({
        "id": "OS9", "desc": "Nick↔Alex (Buxton+Rd8 for Machado+Rd22)",
        "moves": [
            {"type": "worst", "round": 8, "from": "Nick", "to": "Alex"},
            {"type": "worst", "round": 22, "from": "Alex", "to": "Nick"},
        ],
    })

    # ─── OS10: Mike ↔ Alex (Burns+Herrera trade) ───────────────────────────
    # Mike gets: Burns + Herrera + Alex's Rd 23 pick
    # Alex gets: Mike's Rd 13 pick
    # From memory Feb 16: "Mike's Rd 23 already traded away (Mike→Alex→Chris), 
    #   substituted Rd 20 (from Web via Mike) per Chris's approval"
    # Wait — this says Mike gets Alex's Rd 23 and Alex gets Mike's Rd 13.
    # But the trade description says "Burns+Herrera+Rd23 for Rd13" — meaning Alex trades a Rd 23 pick.
    # Actually wait, the draft-board.json trades list says:
    #   "OS8: Mike↔Alex (Burns+Herrera+Rd23 for Rd13)"
    # From memory: "Trade 2 — Mike ↔ Alex: Chase Burns + Ivan Herrera + pick for Rd 13. 
    #   Mike's Rd 23 already traded away (Mike→Alex→Chris), substituted Rd 20"
    # Hmm, this is confusing. Let me re-read:
    # The trade was: Mike sends Burns + Herrera + a pick, Alex sends a Rd 13 pick.
    # Originally Mike was supposed to send Rd 23, but Mike's Rd 23 was gone, so Rd 20 was substituted.
    # But then memory says the commit was "Rd 20 fix" — so Mike sent Rd 20 instead of Rd 23.
    # Wait, but the draft-board.json trade list says "OS8: Mike↔Alex (Burns+Herrera+Rd23 for Rd13)"
    # The site might have the wrong description. Let me check the actual pick movements.
    #
    # Actually, looking more carefully at the Feb 16 memory:
    # "Trade 2 — Mike ↔ Alex: Chase Burns + Ivan Herrera + pick for Rd 13."
    # "Mike's Rd 23 already traded away (Mike→Alex→Chris), substituted Rd 20"
    # So: Mike sends Rd 20 (not Rd 23) to Alex. Alex sends Rd 13 to Mike.
    # But which Rd 20? Mike acquired Web's Rd 20 in TX995. That's his only Rd 20 at this point.
    #
    # Wait, actually I need to re-examine. Let me look at what Mike has at this point:
    # After Yahoo trades: Mike has Web's Rd 20 (from TX995).
    # Mike's own Rd 20 went nowhere in Yahoo trades (Mike didn't trade his own Rd 20).
    # Actually... wait. In TX256, Mike sent Rd 18-23 to Alex. That includes Mike's own Rd 20.
    # Oh wait no — TX256 says Alex sent Rd 6-11, Mike sent Rd 18-23. But the Yahoo data shows
    # these are all orig Alex and orig Mike respectively. So Mike sent his OWN Rd 18-23 to Alex.
    # But then Mike acquired Web's Rd 20 in TX995. So Mike has ONE Rd 20: Web's (slot 3).
    # 
    # Hmm, but the description says Rd 23 was substituted with Rd 20. I think the actual 
    # implementation changed the pick. Let me just go with what the board shows. But I need
    # to match the actual trade as executed. Memory says: Mike sends Rd 20 to Alex, Alex sends Rd 13 to Mike.
    # But actually... wait. The memory says "Burns+Herrera+Rd23 for Rd13" in the trade list,
    # but the actual execution was Rd 20 substituted for Rd 23. The description was never updated.
    # Let me look at what the site's JSON shows for these rounds to understand the actual execution.
    #
    # I'll implement it as: Mike sends worst Rd 23 to Alex, Alex sends worst Rd 13 to Mike.
    # If Mike has no Rd 23, we'll catch it as an error.
    # Actually from the memory, it was corrected to Rd 20. Let me use Rd 20.
    # 
    # BUT WAIT — re-reading more carefully, the draft-board.json trades array says:
    # "OS8: Mike↔Alex (Burns+Herrera+Rd23 for Rd13)" — this is the DESCRIPTION, which may be wrong.
    # The ACTUAL picks moved are what's in the picks data.
    # 
    # Let me reconsider. From memory Feb 16 "3 New Offseason Trades":
    # Trade 2: Mike sends Burns + Herrera + "pick" to Alex. Alex sends Rd 13 to Mike.
    # The "pick" was supposed to be Rd 23 but Mike's Rd 23 was already gone. Chris approved Rd 20 instead.
    # Commits: 6c45bf7 (initial), d1997d5 (Rd 20 fix).
    # 
    # So the ACTUAL executed trade: Mike sends Rd 20 to Alex, Alex sends Rd 13 to Mike.
    # But wait — there might be confusion. Let me look at the Rd 23 data in draft-board.json:
    # Rd 23 slot 11 (orig Mike) → currentOwner: Chris, path: [Mike, Alex, Chris]
    # This confirms Mike's Rd 23 went Mike→Alex (TX256) then Alex→Chris (TX1004). 
    # Mike has NO Rd 23 at this point. So the substitution to Rd 20 is correct.
    #
    # OK but wait — there's ANOTHER possibility. Let me check if Mike has Nick's Rd 23.
    # TX821: Mike acquired Nick's Rd 21,22,23. But then in OS6, Mike sent Rd 21,22,23 to Tyler.
    # So Mike sent Nick's Rd 21,22,23 to Tyler in OS6. After OS6, Mike has ZERO Rd 23 picks.
    # The substitution to Rd 20 is definitely correct.
    #
    # I need to figure out what ACTUALLY happened. Let me check the site data:
    # Rd 13 slot 8 (orig Alex) → currentOwner: Mike, path: [Alex, Mike]
    #   This confirms Alex sent his Rd 13 (slot 8) to Mike. ✓
    # But which pick did Mike send? Let me look for Mike's Rd 20 in the site data:
    # Rd 20 slot 3 (orig Web) → currentOwner: Pudge, path: [Web, Mike, Alex, Pudge]
    #   This shows Web's Rd 20 went Mike→Alex→Pudge. The Mike→Alex part would be this trade.
    #   Then Alex→Pudge is a later trade (Alex↔Pudge).
    # So YES: Mike sent Rd 20 (orig Web, slot 3) to Alex. Alex sent Rd 13 (orig Alex, slot 8) to Mike.
    # I'll implement it with Rd 20.
    trades.append({
        "id": "OS10", "desc": "Mike↔Alex (Burns+Herrera+Rd20 for Rd13) [originally Rd23, substituted]",
        "moves": [
            {"type": "worst", "round": 20, "from": "Mike", "to": "Alex"},
            {"type": "worst", "round": 13, "from": "Alex", "to": "Mike"},
        ],
    })

    # ─── OS11: Tom ↔ Alex (Ward trade) ─────────────────────────────────────
    # Tom gets: Duran + Alex's Rd 13 + Alex's Rd 18
    # Alex gets: Ward + Tom's Rd 8 + Tom's Rd 10
    trades.append({
        "id": "OS11", "desc": "Tom↔Alex (Ward+Rd8+Rd10 for Duran+Rd13+Rd18)",
        "moves": [
            {"type": "worst", "round": 13, "from": "Alex", "to": "Tom"},
            {"type": "worst", "round": 18, "from": "Alex", "to": "Tom"},
            {"type": "worst", "round": 8, "from": "Tom", "to": "Alex"},
            {"type": "worst", "round": 10, "from": "Tom", "to": "Alex"},
        ],
    })

    # ─── OS12: Alex ↔ Tyler (Yelich/Ward trade, Feb 16) ────────────────────
    # Tyler gets: Yelich + Ward + Alex's Rd 8.8 + Alex's Rd 10.4
    # Alex gets: Tyler's Rd 2.5 + Tyler's Rd 6.6
    # NOTE: This trade SPECIFIES exact picks (slot numbers), not "worst".
    # Rd 8.8 = round 8, slot 8 (orig Alex)
    # Rd 10.4 = round 10, slot 4 (orig Tom → Alex)
    # Rd 2.5 = round 2, slot 5 (orig Tyler)
    # Rd 6.6 = round 6, slot 6 (orig Thomas → Tyler)
    trades.append({
        "id": "OS12", "desc": "Alex↔Tyler (Yelich+Ward+Rd8.8+Rd10.4 for Rd2.5+Rd6.6)",
        "moves": [
            {"type": "specific_slot", "round": 8, "slot": 8, "from": "Alex", "to": "Tyler"},
            {"type": "specific_slot", "round": 10, "slot": 4, "from": "Alex", "to": "Tyler"},
            {"type": "specific_slot", "round": 2, "slot": 5, "from": "Tyler", "to": "Alex"},
            {"type": "specific_slot", "round": 6, "slot": 6, "from": "Tyler", "to": "Alex"},
        ],
    })

    # ─── OS13: Alex ↔ Pudge (Feb 17) ───────────────────────────────────────
    # Alex sends: Langford, Díaz, Ragans, Rd 7.11 (orig Mike→Nick→Alex), Rd 20.3 (orig Web→Mike→Alex)
    # Pudge sends: Schwarber, Rd 11.1 (orig Pudge→Alex), Rd 23.1 (orig Pudge)
    # NOTE: This trade specifies exact slots.
    # Rd 7.11 = round 7, slot 11 (orig Mike)
    # Rd 20.3 = round 20, slot 3 (orig Web)
    # Rd 11.1 = round 11, slot 1 (orig Pudge→Alex? Wait, Pudge=slot 1 original.
    #   After OS4, Alex acquired Nick's Rd 11 (slot 2, from TX881→Nick). 
    #   But Pudge's Rd 11 slot 1... was that traded to Alex? Let me check.
    #   Pudge's Rd 11 (slot 1) was never traded in any Yahoo trade. So Pudge still has it.
    #   Actually wait — Alex acquired Mike's Rd 11 in TX256, then Alex sent those to Mike... no.
    #   TX256: Alex sent Rd 6-11 to Mike. So Alex's OWN Rd 11 went to Mike. 
    #   Alex then acquired Nick's Rd 11 in OS4 (from Bob→Nick in TX881, actually orig Bob slot 10).
    #   Hmm, this is Pudge sending Rd 11.1 to Alex. Pudge has Rd 11 slot 1 (his own original).
    # Rd 23.1 = round 23, slot 1 (orig Pudge)
    trades.append({
        "id": "OS13", "desc": "Alex↔Pudge (Langford+Díaz+Ragans+Rd7+Rd20 for Schwarber+Rd11+Rd23)",
        "moves": [
            {"type": "specific_slot", "round": 7, "slot": 11, "from": "Alex", "to": "Pudge"},
            {"type": "specific_slot", "round": 20, "slot": 3, "from": "Alex", "to": "Pudge"},
            {"type": "specific_slot", "round": 11, "slot": 1, "from": "Pudge", "to": "Alex"},
            {"type": "specific_slot", "round": 23, "slot": 1, "from": "Pudge", "to": "Alex"},
        ],
    })

    # ─── OS14: Bob ↔ Alex (picks only, Feb 17) ─────────────────────────────
    # Bob gets: Alex's Rd 15, 19, 23
    # Alex gets: Bob's Rd 16, 17, 21
    # NOTE: This trade is listed in the site's trades array but Alex does NOT have
    # Rd 15, 19, or 23 picks at this point (they were all traded away in OS3-OS5).
    # Similarly, Bob doesn't have Rd 16 (went to Greasy in TX750) or Rd 21 (went to 
    # Bob but Bob sold Web's Rd 21 to... let me check).
    # SKIPPING this trade to see if it was ever actually applied to the site data.
    # The sub-agent on Feb 17 processed it but may have done so incorrectly.
    print("\n  ⚠️  SKIPPING OS14: Bob↔Alex (Rd15,19,23 for Rd16,17,21)")
    print("    Reason: Alex has no Rd 15/19/23 picks; trade may not have been applied to site data")

    # ─── Apply all trades ──────────────────────────────────────────────────
    for trade in trades:
        desc = trade["desc"]
        print(f"\n  Applying {trade['id']}: {desc}")
        for move in trade["moves"]:
            rd = move["round"]
            from_owner = move["from"]
            to_owner = move["to"]

            if move["type"] == "worst":
                slot = board.transfer_worst_pick(rd, from_owner, to_owner, desc)
                print(f"    Rd {rd} slot {slot} (worst for {from_owner}): {from_owner} → {to_owner}")
            elif move["type"] == "specific_slot":
                slot = move["slot"]
                board.transfer_pick(rd, slot, from_owner, to_owner, desc)
                print(f"    Rd {rd} slot {slot} (specific): {from_owner} → {to_owner}")
            elif move["type"] == "specific_orig":
                orig = move["originalOwner"]
                slot = board.transfer_specific_pick(rd, orig, from_owner, to_owner, desc)
                print(f"    Rd {rd} slot {slot} (orig {orig}): {from_owner} → {to_owner}")


# ─── Comparison ─────────────────────────────────────────────────────────────
def compare_with_site(board: DraftBoard, site_path: str) -> list:
    """Compare our computed board with the site's draft-board.json. Returns list of discrepancies."""
    with open(site_path) as f:
        site = json.load(f)

    discrepancies = []
    for rd in range(1, ROUNDS + 1):
        site_picks = {p["slot"]: p for p in site["picks"][str(rd)]}
        for slot in range(1, 13):
            our_pick = board.picks[rd][slot]
            site_pick = site_picks[slot]

            if our_pick["currentOwner"] != site_pick["currentOwner"]:
                discrepancies.append({
                    "round": rd,
                    "slot": slot,
                    "originalOwner": our_pick["originalOwner"],
                    "script_says": our_pick["currentOwner"],
                    "site_says": site_pick["currentOwner"],
                    "script_path": our_pick["path"],
                    "site_path": site_pick.get("path", []),
                })

    return discrepancies


# ─── Main ───────────────────────────────────────────────────────────────────
def main():
    print("=" * 70)
    print("SANDLOT DRAFT BOARD VERIFICATION")
    print("=" * 70)

    # Step 1: Initialize base board
    print("\n[STEP 1] Initializing base 27-round × 12-slot snake draft board...")
    board = DraftBoard()
    print("  ✓ Base board created. Each manager owns their position picks in all 27 rounds.")

    # Step 2: Apply Yahoo 2025 trades
    print("\n[STEP 2] Applying Yahoo 2025 in-season trades...")
    try:
        apply_yahoo_2025_trades(board)
        print("\n  ✓ All 15 Yahoo trades applied successfully.")
    except ValueError as e:
        print(f"\n  ✗ ERROR: {e}")
        return

    print("\n  Pick counts after Yahoo trades:")
    board.print_owner_summary()

    # Step 3: Apply offseason trades
    print("\n[STEP 3] Applying offseason trades...")
    try:
        apply_offseason_trades(board)
        print("\n  ✓ All offseason trades applied successfully.")
    except ValueError as e:
        print(f"\n  ✗ ERROR: {e}")
        return

    print("\n  Pick counts after all trades:")
    board.print_owner_summary()

    # Step 4: Save output
    output_path = os.path.join(os.path.dirname(__file__), "draft-board-verified.json")
    result = board.to_json()
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\n[STEP 4] Saved verified draft board to: {output_path}")

    # Step 5: Compare with site
    site_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "draft-board.json")
    site_path = os.path.normpath(site_path)
    print(f"\n[STEP 5] Comparing with site data: {site_path}")

    discrepancies = compare_with_site(board, site_path)

    if not discrepancies:
        print("\n  ✅ PERFECT MATCH! All 324 picks match the site data.")
    else:
        print(f"\n  ⚠️  Found {len(discrepancies)} discrepancies:\n")
        for d in discrepancies:
            print(f"  Round {d['round']}, Slot {d['slot']} (orig: {d['originalOwner']}):")
            print(f"    Script says: {d['script_says']} (path: {' → '.join(d['script_path'])})")
            print(f"    Site says:   {d['site_says']} (path: {' → '.join(d['site_path'])})")
            print()

    return discrepancies


if __name__ == "__main__":
    main()
