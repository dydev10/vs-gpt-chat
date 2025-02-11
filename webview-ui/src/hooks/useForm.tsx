import { FormEvent, KeyboardEvent, useCallback } from "react";

const useForm = (inputId: string,  onSubmit?: (text: string) => void) => {
  const submitForm = useCallback(() => {
    const textArea = document.getElementById(inputId) as HTMLInputElement;
    const text = textArea.value;
    if (text && onSubmit) {
      onSubmit(text);
    }
  }, [inputId, onSubmit]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // trigger submit on enter press
    if (!e.shiftKey && e.code == 'Enter') {
      e.preventDefault();
      submitForm();
    }
  }, [submitForm]);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  return {
    handleKeyDown,
    handleFormSubmit,
  };
};

export default useForm;
