+++
title = "[Draft] It Named Itself Fable"
date = 2026-11-22T08:00:00Z
draft = false
description = "I trained two open models on my own taste in short stories. Both learned it. Then one named itself Fable, a word for a story with a moral, and my taste note says: no moral is spelled out."
tags = ["llm", "reinforcement-learning", "fiction", "agents"]
categories = ["research"]
images = ["/storyteller-rl/win-rates.png"]
+++

_Draft: still being edited. This label comes off when it is final._

I trained two open models with one reward: my taste in short stories, written as a 250-word note and read by a judge model.
On new prompts, with story lengths matched, the judge liked the trained story in 93% and 98% of pairs.
Then I asked one of them to pick a name, and it chose Fable, a kind of story known for its moral, after it had learned to stop writing morals.

[![Win rates of each trained model over its own base, all far above the 50% coin-flip line](/storyteller-rl/win-rates.png)](/storyteller-rl/)

[Read the full post →](/storyteller-rl/)
