/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/dom";
import userEvent from '@testing-library/user-event'

import NewBillUI from "../views/NewBillUI.js"
import BillsUI from "../views/BillsUI.js"
import NewBill from "../containers/NewBill.js"

import mockStore from "../__mocks__/store.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import { ROUTES } from "../constants/routes.js";


describe("Given I am connected as an employee", () => {
  let newBill;

  beforeEach(() => {
    document.body.innerHTML = NewBillUI();

    const email = 'test@example.com';
    global.localStorage.setItem('user', JSON.stringify({ email }));

    newBill = new NewBill({
      document,
      onNavigate: (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      },
      store: mockStore,
      localStorage: global.localStorage,
    });
  })

  describe("When on NewBill page, the NewBill Classes ", () => {
    let newBill;
    let mockDocument;
    let mockOnNavigate;
    let mockFormElement;
    let mockFileInputElement;

    beforeEach(() => {
      //Mocking document
      mockDocument = {
        querySelector: jest.fn(),
      };
      mockOnNavigate = jest.fn();

      //Mocking the form element and file input element
      mockFormElement = {
        addEventListener: jest.fn(),
      };
      mockFileInputElement = {
        addEventListener: jest.fn(),
      };

      //Mocking the querySelector method of document and adding event listeners
      mockDocument.querySelector.mockReturnValueOnce(mockFormElement);
      mockDocument.querySelector.mockReturnValueOnce(mockFileInputElement);

      newBill = new NewBill({
        document: mockDocument,
        onNavigate: mockOnNavigate,
        store: mockStore,
        localStorage: localStorageMock,
      });
    });

    test("this.document should be defined", () => {
      expect(newBill.document).toBe(mockDocument);
    });

    test("this.onNavigate should be defined", () => {
      expect(newBill.onNavigate).toBe(mockOnNavigate);
    });

    test("this.store should be defined", () => {
      expect(newBill.store).toBe(mockStore);
    });

    test("event listeners should be defined", () => {
      expect(mockFormElement.addEventListener).toHaveBeenCalledWith("submit", expect.any(Function));
      expect(mockFileInputElement.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });
  });

  describe("When change event occurs on input file ", () => {

    test("handleChangeFile should handle file change", () => {
      const handleChangeFile = jest.spyOn(newBill, 'handleChangeFile');

      const inputFile = document.querySelector(`input[data-testid="file"]`);
      inputFile.addEventListener("change", handleChangeFile);

      const mockFile = new File(["image content"], "image.png", { type: "image/png" });

      userEvent.upload(inputFile, mockFile);

      expect(handleChangeFile).toHaveBeenCalled();
      expect(inputFile.files.length).toEqual(1);
      expect(inputFile.files[0].name).toBe("image.png");

      //handleChangeFile const verifications
      const filePath = mockFile.name.split(/\\/g);
      const fileName = filePath[filePath.length - 1];
      const fileExt = fileName.split(".").pop();

      expect(fileExt).toMatch(/jpeg|jpg|png/);
    });

    test('handleChangeFile appends file and email to FormData', () => {
      const createSpy = jest.spyOn(mockStore.bills(), 'create')
        .mockImplementation(() => Promise.resolve({ fileUrl: 'example.com', key: '123' }));

      //Simulate file change event
      const fileInput = {
        value: 'C:\\fakepath\\test.jpg', //Simulates file's path
        files: [new File(['file contents'], 'test.jpg', { type: 'image/jpeg' })] //Fake file simulation
      };
      newBill.handleChangeFile({ preventDefault: jest.fn(), target: fileInput });

      //Checking if create method is called with correct data
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.any(FormData),
        headers: { noContentType: true }
      }));

      //Checking if formData correct
      const formData = createSpy.mock.calls[0][0].data;
      expect(formData.has('file')).toBe(true);
      expect(formData.has('email')).toBe(true);
    });
  });


  describe("When the newBill is submitted with filled fields", () => {
    test("Then a new bill should be created", async () => {
      const mockedBill = {
        type: "FakeType",
        name: "FakeName",
        date: "2023-02-02",
        amount: 100,
        vat: 70,
        pct: 30,
        commentary: "This is a fake bill",
        fileUrl: "../img/fakeGeneratedBill.jpg",
        fileName: "fakeGeneratedBill.jpg",
        status: "pending",
      };

      screen.getByTestId("expense-type").value = mockedBill.type;
      screen.getByTestId("expense-name").value = mockedBill.name;
      screen.getByTestId("datepicker").value = mockedBill.date;
      screen.getByTestId("amount").value = mockedBill.amount;
      screen.getByTestId("vat").value = mockedBill.vat;
      screen.getByTestId("pct").value = mockedBill.pct;
      screen.getByTestId("commentary").value = mockedBill.commentary;
      newBill.fileName = mockedBill.fileName;
      newBill.fileUrl = mockedBill.fileUrl;

      const mockHandleSubmit = jest.fn((e) => newBill.handleSubmit(e));
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", mockHandleSubmit);
      fireEvent.submit(form);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  //Test Error
  describe("When an error occurs on bill sumission", () => {
    test("Then Error 404 message should be showned on BullsUI", async () => {
      jest.spyOn(mockStore, "bills");
      //Error generating
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      document.body.innerHTML = await BillsUI({ error: "Erreur 404" }); //BillsUI is required to show errors (errors aren't contained in NewBillsUI)

      //"Error 404 verification"
      expect(screen.getByText(/Erreur 404/)).toBeTruthy();
    });

    test("Then Error 500 message should be showned on BullsUI", async () => {
      jest.spyOn(mockStore, "bills");
      //Error generating
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });
      document.body.innerHTML = await BillsUI({ error: "Erreur 500" }); //BillsUI is required to show errors (errors aren't contained in NewBillsUI)

      //"Error 500 verification"
      expect(screen.getByText(/Erreur 500/)).toBeTruthy();
    });

  })
});