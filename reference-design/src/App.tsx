import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ProgressBar } from './components/ProgressBar';
import { TimeGridSetup } from './components/TimeGridSetup';
import { ResourceLibrary } from './components/ResourceLibrary';
import { CurriculumDesign } from './components/CurriculumDesign';
import { ClassFactory } from './components/ClassFactory';
import { AssignmentMatrix } from './components/AssignmentMatrix';
import { GenerationTower } from './components/GenerationTower';
import { TimetableExport } from './components/TimetableExport';

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <TimeGridSetup onNext={handleNext} />;
      case 2:
        return <ResourceLibrary onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <CurriculumDesign onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <ClassFactory onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <AssignmentMatrix onNext={handleNext} onBack={handleBack} />;
      case 6:
        return <GenerationTower onNext={handleNext} onBack={handleBack} />;
      case 7:
        return <TimetableExport onBack={handleBack} />;
      default:
        return <TimeGridSetup onNext={handleNext} />;
    }
  };

  return (
    <Layout currentStep={currentStep}>
      <ProgressBar currentStep={currentStep} onStepClick={handleStepClick} />
      {renderStep()}
    </Layout>
  );
}