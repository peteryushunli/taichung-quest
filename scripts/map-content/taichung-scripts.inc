@ Taichung prototype: dedicated persistent state, separate from the Kanto story.
.equ TAICHUNG_LANGUAGE, VAR_0x40FB
.equ TAICHUNG_STARTER_SPECIES, VAR_0x40FC
.equ TAICHUNG_QUEST_STATE, VAR_0x40FD

PalletTown_MapScripts::
	map_script MAP_SCRIPT_ON_TRANSITION, Taichung_OnTransition
	map_script MAP_SCRIPT_ON_RESUME, Taichung_OnTransition
	map_script MAP_SCRIPT_ON_FRAME_TABLE, Taichung_OnFrame
	.byte 0

Taichung_OnTransition::
	setworldmapflag FLAG_WORLD_MAP_PALLET_TOWN
	setrespawn HEAL_LOCATION_PALLET_TOWN
	call_if_eq TAICHUNG_STARTER_SPECIES, 0, Taichung_MigrateLegacyStarter
	end

@ The first prototype gave Bulbasaur before this dedicated starter variable existed.
@ Keep those saved parties intact, including when that Bulbasaur has evolved.
Taichung_MigrateLegacyStarter::
	goto_if_eq TAICHUNG_QUEST_STATE, 0, EventScript_Return
	getpartysize
	goto_if_eq VAR_RESULT, 0, EventScript_Return
	setvar TAICHUNG_STARTER_SPECIES, SPECIES_BULBASAUR
	return

Taichung_OnFrame::
	map_script_2 TAICHUNG_LANGUAGE, 0, Taichung_InitLanguage
	map_script_2 TAICHUNG_STARTER_SPECIES, 0, Taichung_Welcome
	.2byte 0

Taichung_InitLanguage::
	lockall
	call Taichung_ChooseLanguageCore
	releaseall
	end

Taichung_EventScript_ChooseLanguage::
	lockall
	call Taichung_ChooseLanguageCore
	msgbox Taichung_Text_LanguageChanged
	releaseall
	end

Taichung_ChooseLanguageCore::
	message Taichung_Text_LanguagePrompt
	waitmessage
	multichoice 16, 1, MULTICHOICE_TAICHUNG_LANGUAGE, TRUE
	goto_if_eq VAR_RESULT, 0, Taichung_SetEnglish
	goto_if_eq VAR_RESULT, 1, Taichung_SetChinese
	goto Taichung_ChooseLanguageCore

Taichung_SetEnglish::
	setvar TAICHUNG_LANGUAGE, 1
	return

Taichung_SetChinese::
	setvar TAICHUNG_LANGUAGE, 2
	return

Taichung_Welcome::
	lockall
	msgbox Taichung_Text_Welcome

Taichung_ChooseStarter::
	message Taichung_Text_ChooseStarter
	waitmessage
	multichoice 16, 1, MULTICHOICE_TAICHUNG_STARTERS, TRUE
	goto_if_eq VAR_RESULT, 0, Taichung_PickCharmander
	goto_if_eq VAR_RESULT, 1, Taichung_PickBulbasaur
	goto_if_eq VAR_RESULT, 2, Taichung_PickSquirtle
	goto_if_eq VAR_RESULT, 3, Taichung_PickPikachu
	@ B is disabled, and any unexpected result reopens the choice safely.
	goto Taichung_ChooseStarter

Taichung_PickCharmander::
	setvar VAR_0x8004, SPECIES_CHARMANDER
	setvar VAR_STARTER_MON, 2
	goto Taichung_GiveStarter

Taichung_PickBulbasaur::
	setvar VAR_0x8004, SPECIES_BULBASAUR
	setvar VAR_STARTER_MON, 0
	goto Taichung_GiveStarter

Taichung_PickSquirtle::
	setvar VAR_0x8004, SPECIES_SQUIRTLE
	setvar VAR_STARTER_MON, 1
	goto Taichung_GiveStarter

Taichung_PickPikachu::
	setvar VAR_0x8004, SPECIES_PIKACHU
	setvar VAR_STARTER_MON, 0
	goto Taichung_GiveStarter

Taichung_GiveStarter::
	givemon VAR_0x8004, 5
	goto_if_eq VAR_RESULT, MON_CANT_GIVE, Taichung_ChooseStarter
	copyvar TAICHUNG_STARTER_SPECIES, VAR_0x8004
	setvar TAICHUNG_QUEST_STATE, 1
	additem ITEM_POKE_BALL, 5
	additem ITEM_POTION, 3
	additem ITEM_BICYCLE, 1
	setflag FLAG_SYS_POKEMON_GET
	setflag FLAG_SYS_POKEDEX_GET
	setflag FLAG_SYS_B_DASH
	setflag FLAG_BEAT_RIVAL_IN_OAKS_LAB
	setflag FLAG_OPENED_START_MENU
	setflag FLAG_HIDE_BULBASAUR_BALL
	setflag FLAG_HIDE_SQUIRTLE_BALL
	setflag FLAG_HIDE_CHARMANDER_BALL
	setflag FLAG_HIDE_RIVAL_IN_LAB
	clearflag FLAG_HIDE_OAK_IN_HIS_LAB
	setvar VAR_MAP_SCENE_PALLET_TOWN_OAK, 1
	setvar VAR_MAP_SCENE_PALLET_TOWN_PROFESSOR_OAKS_LAB, 6
	bufferspeciesname STR_VAR_1, TAICHUNG_STARTER_SPECIES
	msgbox Taichung_Text_StarterChosen
	releaseall
	end

PalletTown_EventScript_FatMan::
	lock
	faceplayer
	goto_if_eq TAICHUNG_QUEST_STATE, 3, Taichung_TeaDelivered
	goto_if_eq TAICHUNG_QUEST_STATE, 2, Taichung_TeaReminder
	msgbox Taichung_Text_TeaRequest, MSGBOX_YESNO
	goto_if_eq VAR_RESULT, NO, Taichung_TeaDeclined
	setvar TAICHUNG_QUEST_STATE, 2
	msgbox Taichung_Text_TeaAccepted
	release
	end

Taichung_TeaDeclined::
	msgbox Taichung_Text_TeaDeclined
	release
	end

Taichung_TeaReminder::
	msgbox Taichung_Text_TeaReminder
	release
	end

Taichung_TeaDelivered::
	msgbox Taichung_Text_TeaThanks
	release
	end

PalletTown_EventScript_SignLady::
	lock
	faceplayer
	goto_if_eq TAICHUNG_QUEST_STATE, 3, Taichung_GuideDone
	goto_if_eq TAICHUNG_QUEST_STATE, 2, Taichung_DeliverTea
	msgbox Taichung_Text_GuideWaiting
	release
	end

Taichung_DeliverTea::
	msgbox Taichung_Text_GuideThanks
	additem ITEM_POTION, 1
	goto_if_eq VAR_RESULT, FALSE, Taichung_BagFull
	setvar TAICHUNG_QUEST_STATE, 3
	playfanfare MUS_OBTAIN_ITEM
	msgbox Taichung_Text_QuestComplete
	waitfanfare
	release
	end

Taichung_BagFull::
	msgbox Taichung_Text_BagFull
	release
	end

Taichung_GuideDone::
	msgbox Taichung_Text_GuideDone
	release
	end

PalletTown_EventScript_OaksLabSign::
	msgbox Taichung_Text_FieldStation, MSGBOX_SIGN
	end

PalletTown_EventScript_PlayersHouseSign::
	msgbox Taichung_Text_GuestHouse, MSGBOX_SIGN
	end

PalletTown_EventScript_RivalsHouseSign::
	msgbox Taichung_Text_TeaHouse, MSGBOX_SIGN
	end

PalletTown_EventScript_TownSign::
	msgbox Taichung_Text_TownSign, MSGBOX_SIGN
	end

PalletTown_EventScript_TrainerTips::
	msgbox Taichung_Text_GreenwaySign, MSGBOX_SIGN
	end
