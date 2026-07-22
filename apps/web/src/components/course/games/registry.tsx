'use client';
import type { ComponentType } from 'react';

import { FindAiGame } from './find-ai';
import { TuringTestGame } from './turing-test';
import { WorkCardGame, WorkCard1Game } from './work-card-game';
import { SpotDiffGame } from './spot-diff';
import { KeywordImageGame } from './keyword-image';
import { FreeImageGame } from './free-image';
import { DecorateRoomGame } from './decorate-room';
import { VideoDetectiveGame } from './video-detective';
import { KeyframeOrderGame } from './keyframe-order';
import { FrameVideoGame } from './frame-video';
import { VideoStudioGame } from './video-studio';
import { AiDirectorGame } from './ai-director';
import { MiniInteractionGame } from './mini-interaction';
import { CancelSubscriptionGame } from './cancel-subscription';
import { MemoryMatchGame } from './memory-match';
import { MemoryMatchCreateGame } from './memory-match-create';
import { PortfolioGame } from './portfolio';
import { LayoutArrangeGame } from './layout-arrange';
import { FreeformAppGame } from './freeform-app';
import { GroupGrabGame } from './group-grab';
import { DigitDetectiveGame } from './digit-detective';
import { PosePlayGame } from './pose-play';
import { StoryFillGame } from './story-fill';
import { PictureBookGame } from './picture-book';
import { AcrosticPoemGame } from './acrostic-poem';
import { DetectiveSummaryGame } from './detective-summary';
import { ClueCardDetectiveGame } from './clue-card-detective';
import { PmRequirementsGame } from './pm-requirements';
import { PmPromptTestGame } from './pm-prompt-test';
import { PmSingleAppGame } from './pm-single-app';
import { PmWorkflowAppGame } from './pm-workflow-app';
import { PmPitchGame } from './pm-pitch';
import { PmCreatorGame } from './pm-creator';

export const GAME_REGISTRY: Record<string, ComponentType> = {
  'group-grab': GroupGrabGame,
  'find-ai': FindAiGame,
  'digit-detective': DigitDetectiveGame,
  'pose-play': PosePlayGame,
  'turing-test': TuringTestGame,
  'work-card-1': WorkCard1Game,
  'clue-card-detective': ClueCardDetectiveGame,
  'story-fill': StoryFillGame,
  'acrostic-poem': AcrosticPoemGame,
  'picture-book': PictureBookGame,
  'spot-diff': SpotDiffGame,
  'keyword-image': KeywordImageGame,
  'free-image': FreeImageGame,
  'decorate-room': DecorateRoomGame,
  'video-detective': VideoDetectiveGame,
  'keyframe-order': KeyframeOrderGame,
  'frame-video': FrameVideoGame,
  'ai-director': AiDirectorGame,
  'video-studio': VideoStudioGame,
  'mini-interaction': MiniInteractionGame,
  'cancel-subscription': CancelSubscriptionGame,
  'memory-match': MemoryMatchGame,
  'memory-match-create': MemoryMatchCreateGame,
  'portfolio': PortfolioGame,
  'layout-arrange': LayoutArrangeGame,
  'freeform-app': FreeformAppGame,
  'work-card': WorkCardGame,
  'detective-summary': DetectiveSummaryGame,
  'pm-requirements': PmRequirementsGame,
  'pm-prompt-test': PmPromptTestGame,
  'pm-single-app': PmSingleAppGame,
  'pm-workflow-app': PmWorkflowAppGame,
  'pm-mini-app': PmWorkflowAppGame,
  'pm-pitch': PmPitchGame,
  'pm-creator': PmCreatorGame,
};
