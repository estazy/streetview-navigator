
import React from 'react';
import { SimulationStatus } from '../types';
import { MIN_SIMULATION_SPEED, MAX_SIMULATION_SPEED, MIN_SV_STEP_DISTANCE, MAX_SV_STEP_DISTANCE } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

interface ControlPanelProps {
  simulationStatus: SimulationStatus;
  onPlayPause: () => void;
  onStop: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  streetViewStepDistance: number;
  onStreetViewStepDistanceChange: (distance: number) => void;
  progress: number;
  disabled: boolean;
}

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
  </svg>
);

const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75V18a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75V18a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
  </svg>
);

const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
  </svg>
);


export const ControlPanel: React.FC<ControlPanelProps> = ({
  simulationStatus,
  onPlayPause,
  onStop,
  speed,
  onSpeedChange,
  streetViewStepDistance,
  onStreetViewStepDistanceChange,
  progress,
  disabled
}) => {
  const { t } = useLocalization();

  const handleSpeedSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseInt(event.target.value, 10); 
    const newSpeed = MAX_SIMULATION_SPEED - ((sliderValue -1) / 99) * (MAX_SIMULATION_SPEED - MIN_SIMULATION_SPEED);
    onSpeedChange(newSpeed);
  };
  const currentSpeedSliderValue = 1 + ((MAX_SIMULATION_SPEED - speed) / (MAX_SIMULATION_SPEED - MIN_SIMULATION_SPEED)) * 99;
  
  const handleStepDistanceSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseInt(event.target.value, 10); 
    const newDistance = MIN_SV_STEP_DISTANCE + ((100 - sliderValue) / 99) * (MAX_SV_STEP_DISTANCE - MIN_SV_STEP_DISTANCE);
    onStreetViewStepDistanceChange(Math.max(MIN_SV_STEP_DISTANCE, Math.min(MAX_SV_STEP_DISTANCE, newDistance)));
  };
  const currentStepDistanceSliderValue = Math.round(100 - (((streetViewStepDistance - MIN_SV_STEP_DISTANCE) / (MAX_SV_STEP_DISTANCE - MIN_SV_STEP_DISTANCE)) * 99));

  // Use static labels from localization, without appending dynamic values
  // Simplified: directly use t.speedLabel and t.progressLabel
  const speedLabelText = t.speedLabel;
  const progressLabelText = t.progressLabel;
  const stepDistanceLabelText = t.stepDistanceLabel;


  return (
    <div className="flex flex-col gap-2.5 p-2.5 bg-gray-700 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onPlayPause}
            disabled={disabled || simulationStatus === SimulationStatus.FINISHED}
            className="p-2 rounded-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
            aria-label={simulationStatus === SimulationStatus.PLAYING ? t.pauseLabel : t.playLabel}
          >
            {simulationStatus === SimulationStatus.PLAYING ? <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
          <button
            onClick={onStop}
            disabled={disabled || simulationStatus === SimulationStatus.STOPPED}
            className="p-2 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label={t.stopLabel}
          >
            <StopIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Speed and Progress Controls Container */}
        <div className="flex-grow w-full flex flex-col sm:flex-row items-center gap-3">
            {/* Speed Control */}
            <div className="w-full sm:flex-1 flex flex-col text-xs sm:text-sm">
              <label htmlFor="speedControl" className="text-gray-300 whitespace-nowrap mb-0.5 self-start">{speedLabelText}</label>
              <input
                type="range"
                id="speedControl"
                min="1" 
                max="100" 
                value={currentSpeedSliderValue}
                onChange={handleSpeedSliderChange}
                disabled={disabled}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
                aria-label={speedLabelText}
              />
            </div>
            
            {/* Progress Bar */}
            <div className="w-full sm:w-auto sm:min-w-[150px] flex flex-col"> 
              <div className="relative w-full"> 
                <div className="flex mb-0.5 items-center justify-between text-2xs sm:text-xs">
                  <div>
                    <span className="font-semibold text-teal-400">{progressLabelText}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-teal-400">{Math.round(progress)}%</span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-teal-800">
                  <div style={{ width: `${progress}%`}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500 transition-all duration-300"></div>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Adjust Step Control */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <label htmlFor="stepDistanceControl" className="text-gray-300 whitespace-nowrap mr-1">
            {stepDistanceLabelText}
          </label>
          <span className="text-2xs sm:text-xs text-gray-400 whitespace-nowrap">{t.stepDistanceCoarse}</span>
          <input
            type="range"
            id="stepDistanceControl"
            min="1"  /* Slider Coarse (maps to MAX_SV_STEP_DISTANCE) */
            max="100" /* Slider Fine (maps to MIN_SV_STEP_DISTANCE) */
            value={currentStepDistanceSliderValue}
            onChange={handleStepDistanceSliderChange}
            disabled={disabled && simulationStatus === SimulationStatus.PLAYING} 
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50 mx-1"
            aria-label={stepDistanceLabelText}
          />
          <span className="text-2xs sm:text-xs text-gray-400 whitespace-nowrap">{t.stepDistanceFine}</span>
      </div>
    </div>
  );
};
