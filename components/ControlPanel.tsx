
import React from 'react';
import { SimulationStatus } from '../types';
import { MIN_SIMULATION_SPEED, MAX_SIMULATION_SPEED, MIN_SV_STEP_DISTANCE, MAX_SV_STEP_DISTANCE } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

interface ControlPanelProps {
  simulationStatus: SimulationStatus;
  onPlayPause: () => void;
  onStop: () => void;
  speed: number; // Current simulation speed (ms per step)
  onSpeedChange: (speed: number) => void;
  streetViewStepDistance: number; // Current step distance (meters)
  onStreetViewStepDistanceChange: (distance: number) => void;
  progress: number; // Simulation progress (0-100)
  disabled: boolean; // Whether controls should be disabled
}

// SVG Icon for Play
const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
  </svg>
);

// SVG Icon for Pause
const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75V18a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75V18a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
  </svg>
);

// SVG Icon for Stop
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
  disabled // This is the overall disabled state for the control panel (e.g. isLoading, no path)
}) => {
  const { t } = useLocalization();

  // Handles changes from the speed slider.
  // Slider value (1-100) is mapped to simulation speed (ms per step).
  // Higher slider value = faster speed = lower ms value.
  const handleSpeedSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseInt(event.target.value, 10); // Slider: 1 (slowest) to 100 (fastest)
    // Map slider value to speed:
    // When sliderValue is 1, newSpeed = MAX_SIMULATION_SPEED.
    // When sliderValue is 100, newSpeed = MIN_SIMULATION_SPEED.
    const newSpeed = MAX_SIMULATION_SPEED - ((sliderValue - 1) / 99) * (MAX_SIMULATION_SPEED - MIN_SIMULATION_SPEED);
    onSpeedChange(newSpeed);
  };
  // Calculates the current slider value (1-100) based on the actual speed (ms).
  // This is the inverse of the mapping in handleSpeedSliderChange.
  const currentSpeedSliderValue = 1 + ((MAX_SIMULATION_SPEED - speed) / (MAX_SIMULATION_SPEED - MIN_SIMULATION_SPEED)) * 99;
  
  // Handles changes from the step distance slider.
  // Slider value (1-100) is mapped to Street View step distance (meters).
  // Lower slider value ("Coarse") = larger step distance.
  // Higher slider value ("Fine") = smaller step distance.
  const handleStepDistanceSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseInt(event.target.value, 10); // Slider: 1 (coarsest) to 100 (finest)
    // Map slider value to step distance:
    // When sliderValue is 1 (coarsest), newDistance approaches MAX_SV_STEP_DISTANCE.
    // When sliderValue is 100 (finest), newDistance approaches MIN_SV_STEP_DISTANCE.
    // The (100 - sliderValue) inverts the slider direction relative to the distance range.
    const newDistance = MIN_SV_STEP_DISTANCE + ((100 - sliderValue) / 99) * (MAX_SV_STEP_DISTANCE - MIN_SV_STEP_DISTANCE);
    onStreetViewStepDistanceChange(Math.max(MIN_SV_STEP_DISTANCE, Math.min(MAX_SV_STEP_DISTANCE, newDistance)));
  };
  // Calculates the current slider value (1-100) based on the actual step distance.
  // This is the inverse of the mapping in handleStepDistanceSliderChange.
  const currentStepDistanceSliderValue = Math.round(100 - (((streetViewStepDistance - MIN_SV_STEP_DISTANCE) / (MAX_SV_STEP_DISTANCE - MIN_SV_STEP_DISTANCE)) * 99));

  // Static labels from localization for accessibility and display
  const speedLabelText = t.speedLabel;
  const progressLabelText = t.progressLabel;
  const stepDistanceLabelText = t.stepDistanceLabel;


  return (
    <div className="flex flex-col gap-2.5 p-2.5 bg-gray-700 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Playback Control Buttons */}
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
            {/* Speed Control Slider */}
            <div className="w-full sm:flex-1 flex flex-col text-xs sm:text-sm">
              <label htmlFor="speedControl" className="text-gray-300 whitespace-nowrap mb-0.5 self-start">{speedLabelText}</label>
              <input
                type="range"
                id="speedControl"
                min="1" // Slider min value
                max="100" // Slider max value
                value={currentSpeedSliderValue}
                onChange={handleSpeedSliderChange}
                disabled={disabled}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
                aria-label={speedLabelText} // Re-use label for accessibility
              />
            </div>
            
            {/* Progress Bar Display */}
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

      {/* Street View Step Distance Control Slider */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <label htmlFor="stepDistanceControl" className="text-gray-300 whitespace-nowrap mr-1">
            {stepDistanceLabelText}
          </label>
          <span className="text-2xs sm:text-xs text-gray-400 whitespace-nowrap">{t.stepDistanceCoarse}</span>
          <input
            type="range"
            id="stepDistanceControl"
            min="1"  // Slider Coarse (maps to larger step distance, MAX_SV_STEP_DISTANCE)
            max="100" // Slider Fine (maps to smaller step distance, MIN_SV_STEP_DISTANCE)
            value={currentStepDistanceSliderValue}
            onChange={handleStepDistanceSliderChange}
            // Previously: disabled={disabled || simulationStatus === SimulationStatus.PLAYING}
            // Changed to allow adjustment during playback. Path regeneration will occur.
            disabled={disabled} 
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50 mx-1"
            aria-label={stepDistanceLabelText} // Re-use label for accessibility
          />
          <span className="text-2xs sm:text-xs text-gray-400 whitespace-nowrap">{t.stepDistanceFine}</span>
      </div>
    </div>
  );
};
