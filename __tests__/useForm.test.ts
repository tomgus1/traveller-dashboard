import { renderHook, act } from "@testing-library/react";
import { useForm } from "../src/hooks/useForm";

describe("useForm Hook", () => {
  const initialFormData = {
    name: "John",
    email: "john@example.com",
    age: 25,
    city: "New York",
  };

  describe("Initialization", () => {
    it("should initialize with provided initial values", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      expect(result.current.form).toEqual(initialFormData);
    });

    it("should handle empty initial values", () => {
      const emptyData = {};
      const { result } = renderHook(() => useForm(emptyData));

      expect(result.current.form).toEqual({});
    });

    it("should handle mixed data types", () => {
      const mixedData = {
        stringField: "text",
        numberField: 42,
        emptyString: "",
        zeroNumber: 0,
      };
      const { result } = renderHook(() => useForm(mixedData));

      expect(result.current.form).toEqual(mixedData);
    });
  });

  describe("updateField", () => {
    it("should update a single field", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("name", "Jane");
      });

      expect(result.current.form.name).toBe("Jane");
      expect(result.current.form.email).toBe("john@example.com"); // Other fields unchanged
    });

    it("should update number fields", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("age", 30);
      });

      expect(result.current.form.age).toBe(30);
    });

    it("should handle multiple sequential updates", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("name", "Jane");
        result.current.updateField("email", "jane@example.com");
        result.current.updateField("age", 28);
      });

      expect(result.current.form).toEqual({
        name: "Jane",
        email: "jane@example.com",
        age: 28,
        city: "New York",
      });
    });

    it("should preserve other fields when updating", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("name", "UpdatedName");
      });

      expect(result.current.form).toEqual({
        ...initialFormData,
        name: "UpdatedName",
      });
    });
  });

  describe("createInputHandler", () => {
    it("should create a handler that updates form field", () => {
      const { result } = renderHook(() => useForm(initialFormData));
      const nameHandler = result.current.createInputHandler("name");

      const mockEvent = {
        target: { value: "Jane Doe" },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        nameHandler(mockEvent);
      });

      expect(result.current.form.name).toBe("Jane Doe");
    });

    it("should handle select element changes", () => {
      const { result } = renderHook(() => useForm(initialFormData));
      const cityHandler = result.current.createInputHandler("city");

      const mockSelectEvent = {
        target: { value: "Los Angeles" },
      } as React.ChangeEvent<HTMLSelectElement>;

      act(() => {
        cityHandler(mockSelectEvent);
      });

      expect(result.current.form.city).toBe("Los Angeles");
    });

    it("should handle number field inputs as strings (form behavior)", () => {
      const { result } = renderHook(() => useForm(initialFormData));
      const ageHandler = result.current.createInputHandler("age");

      const mockEvent = {
        target: { value: "35" },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        ageHandler(mockEvent);
      });

      expect(result.current.form.age).toBe("35"); // Note: comes in as string from DOM
    });

    it("should create different handlers for different fields", () => {
      const { result } = renderHook(() => useForm(initialFormData));
      const nameHandler = result.current.createInputHandler("name");
      const emailHandler = result.current.createInputHandler("email");

      const nameEvent = {
        target: { value: "New Name" },
      } as React.ChangeEvent<HTMLInputElement>;

      const emailEvent = {
        target: { value: "new@email.com" },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        nameHandler(nameEvent);
        emailHandler(emailEvent);
      });

      expect(result.current.form.name).toBe("New Name");
      expect(result.current.form.email).toBe("new@email.com");
    });
  });

  describe("resetForm", () => {
    it("should reset form to initial values", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      // Modify the form
      act(() => {
        result.current.updateField("name", "Modified Name");
        result.current.updateField("age", 99);
      });

      // Reset
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.form).toEqual(initialFormData);
    });

    it("should preserve specified fields when resetting", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      // Modify the form
      act(() => {
        result.current.updateField("name", "Modified Name");
        result.current.updateField("email", "modified@email.com");
        result.current.updateField("age", 99);
      });

      // Reset but preserve name and email
      act(() => {
        result.current.resetForm(["name", "email"]);
      });

      expect(result.current.form).toEqual({
        name: "Modified Name", // Preserved
        email: "modified@email.com", // Preserved
        age: 25, // Reset to initial
        city: "New York", // Reset to initial
      });
    });

    it("should handle empty preserve fields array", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("name", "Modified");
      });

      act(() => {
        result.current.resetForm([]);
      });

      expect(result.current.form).toEqual(initialFormData);
    });
  });

  describe("updateFields", () => {
    it("should update multiple fields at once", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateFields({
          name: "Jane",
          age: 30,
        });
      });

      expect(result.current.form).toEqual({
        name: "Jane",
        email: "john@example.com",
        age: 30,
        city: "New York",
      });
    });

    it("should handle partial updates", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateFields({
          email: "updated@email.com",
        });
      });

      expect(result.current.form).toEqual({
        ...initialFormData,
        email: "updated@email.com",
      });
    });

    it("should handle empty updates object", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateFields({});
      });

      expect(result.current.form).toEqual(initialFormData);
    });
  });

  describe("getFormData", () => {
    it("should return a copy of form data", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      const formData = result.current.getFormData();

      expect(formData).toEqual(initialFormData);
      expect(formData).not.toBe(result.current.form); // Should be a copy, not the same object
    });

    it("should return current form state", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("name", "Updated");
      });

      const formData = result.current.getFormData();

      expect(formData).toEqual({
        ...initialFormData,
        name: "Updated",
      });
    });

    it("should not affect form when modifying returned data", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      const formData = result.current.getFormData();
      formData.name = "Modified Outside";

      expect(result.current.form.name).toBe("John"); // Original unchanged
    });
  });

  describe("setForm", () => {
    it("should completely replace form state", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      const newFormData = {
        name: "Completely New",
        email: "new@domain.com",
        age: 40,
        city: "San Francisco",
      };

      act(() => {
        result.current.setForm(newFormData);
      });

      expect(result.current.form).toEqual(newFormData);
    });

    it("should handle partial replacement with missing fields", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      // TypeScript will prevent this, but testing runtime behavior
      const partialData = {
        name: "Only Name",
      } as typeof initialFormData;

      act(() => {
        result.current.setForm(partialData);
      });

      expect(result.current.form).toEqual(partialData);
    });
  });

  describe("Performance and Memory", () => {
    it("should maintain stable references for callback functions", () => {
      const { result, rerender } = renderHook(() => useForm(initialFormData));

      const initialCreateInputHandler = result.current.createInputHandler;
      const initialUpdateField = result.current.updateField;
      const initialResetForm = result.current.resetForm;

      // Trigger re-render
      rerender();

      // Functions should maintain stable references
      expect(result.current.createInputHandler).toBe(initialCreateInputHandler);
      expect(result.current.updateField).toBe(initialUpdateField);
      expect(result.current.resetForm).toBe(initialResetForm);
    });

    it("should not cause unnecessary re-renders when form state doesn't change", () => {
      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useForm(initialFormData);
      });

      const initialRenderCount = renderCount;

      // Getting form data or calling functions shouldn't cause re-renders
      result.current.getFormData();
      result.current.createInputHandler("name");

      expect(renderCount).toBe(initialRenderCount);
    });
  });

  describe("Edge Cases", () => {
    it("should handle form with single field", () => {
      const singleFieldForm = { username: "user123" };
      const { result } = renderHook(() => useForm(singleFieldForm));

      act(() => {
        result.current.updateField("username", "newuser");
      });

      expect(result.current.form.username).toBe("newuser");
    });

    it("should handle empty string values", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("name", "");
      });

      expect(result.current.form.name).toBe("");
    });

    it("should handle zero values", () => {
      const { result } = renderHook(() => useForm(initialFormData));

      act(() => {
        result.current.updateField("age", 0);
      });

      expect(result.current.form.age).toBe(0);
    });

    it("should work with forms that have numeric string keys", () => {
      const numericKeyForm = { "123": "value", "456": "another" };
      const { result } = renderHook(() => useForm(numericKeyForm));

      act(() => {
        result.current.updateField("123", "updated");
      });

      expect(result.current.form["123"]).toBe("updated");
    });
  });
});
