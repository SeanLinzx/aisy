'use client';
import type { ComponentType } from 'react';

import { FindAiGame } from './find-ai';
import { TuringTestGame } from './turing-test';
import { WorkCardGame, WorkCard1Game } from './work-card-game';
import { SpotDiffGame } from './spot-diff';
import { KeywordImageGame } from './keyword-image';
import { DecorateRoomGame } from './decorate-room';
import { VideoDetectiveGame } from './video-detective';
import { KeyframeOrderGame } from './keyframe-order';
import { FrameVideoGame } from './frame-video';
import { MiniInteractionGame } from './mini-interaction';
import { FixBadUxGame } from './fix-bad-ux';
import { CancelSubscriptionGame } from './cancel-subscription';
import { MemoryMatchGame } from './memory-match';
import { PortfolioGame } from './portfolio';
import { LayoutArrangeGame } from './layout-arrange';
import { FreeformAppGame } from './freeform-app';
import { GroupGrabGame } from './group-grab';
import { StoryFillGame } from './story-fill';
import { PictureBookGame } from './picture-book';
import { AcrosticPoemGame } from './acrostic-poem';
import { DetectiveSummaryGame } from './detective-summary';

export const GAME_REGISTRY: Record<string, ComponentType> = {
  'group-grab': GroupGrabGame,
  'find-ai': FindAiGame,
  'turing-test': TuringTestGame,
  'work-card-1': WorkCard1Game,
  'story-fill': StoryFillGame,
  'acrostic-poem': AcrosticPoemGame,
  'picture-book': PictureBookGame,
  'spot-diff': SpotDiffGame,
  'keyword-image': KeywordImageGame,
  'decorate-room': DecorateRoomGame,
  'video-detective': VideoDetectiveGame,
  'keyframe-order': KeyframeOrderGame,
  'frame-video': FrameVideoGame,
  'mini-interaction': MiniInteractionGame,
  'fix-bad-ux': FixBadUxGame,
  'cancel-subscription': CancelSubscriptionGame,
  'memory-match': MemoryMatchGame,
  'portfolio': PortfolioGame,
  'layout-arrange': LayoutArrangeGame,
  'freeform-app': FreeformAppGame,
  'work-card': WorkCardGame,
  'detective-summary': DetectiveSummaryGame,
};
