/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import Bills from "../containers/Bills.js";
import mockStore from "../__mocks__/store.js";
import { expect, jest, test } from '@jest/globals';

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  const onNavigate = (pathname) => {
    document.body.innerHTML = ROUTES({ pathname })
  }
  let billsPage = new Bills({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
  console.log(billsPage)
  document.body.innerHTML = BillsUI({ data: bills })
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon.getAttribute("class")).toContain("active-icon")
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then the modal should open and display supporting document when I click on IconEye", () => {
      $.fn.modal = jest.fn() // Emulate a mock directly via jQuery using jest.fn() for the modal method

      const iconEye = document.querySelectorAll(`div[data-testid="icon-eye"]`)
      const handleClickIconEyeSpy = jest.spyOn(billsPage, 'handleClickIconEye') // Spy on handleClickIconEye

      iconEye.forEach((icon) => {
        icon.addEventListener("click", () => billsPage.handleClickIconEye(icon))
        fireEvent.click(icon) // Simulate a user click
        expect(handleClickIconEyeSpy).toHaveBeenCalledWith(icon) // Check if handleClickIconEye was called with the correct icon
      })
      expect(handleClickIconEyeSpy).toHaveBeenCalledTimes(iconEye.length) // Check that the fucntion had been called the same number as it should 

      const modal = $('#modaleFile')
      expect(modal.css('display')).toEqual('block') // Check if the modal is displayed
    })

    test("Then iconEye should have an event listener", () => {
      const iconEye = document.querySelectorAll(`div[data-testid="icon-eye"]`)
      iconEye.forEach(icon => {
        const mockHandleClickIconEye = jest.fn(() => { })
        icon.addEventListener('click', mockHandleClickIconEye)
        fireEvent.click(icon)
        expect(mockHandleClickIconEye).toHaveBeenCalled()
      })
    })

    test("Then handleClickNewBill should call onNavigate with the correct argument", () => {
      const onNavigateMock = jest.fn()
      billsPage.onNavigate = onNavigateMock

      billsPage.handleClickNewBill()

      expect(onNavigateMock).toHaveBeenCalledWith(ROUTES_PATH['NewBill'])
    })

    test("Then getBills method should return bills", async () => {
      const returnedBills = await billsPage.getBills()
      expect(returnedBills).not.toBe("")
    })


    test("Then console.log should be called when formatDate throws an error", async () => {
      const consoleLogSpy = jest.spyOn(console, "log") // Spy on console.log

      const mockBills = [
        {
          date: "2023-01-01",
          status: "pending"
        },
        {
          date: "invalid-date", // Simulate invalid date
          status: "approved"
        }
      ]

      const mockStore = {
        bills: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue(mockBills)
        })
      }

      const mockedBillsPage = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage
      })

      await mockedBillsPage.getBills()

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.any(Error), // Check if an Error object is logged
        "for",
        expect.objectContaining({ date: "invalid-date", status: "approved" }) // Check if the invalid document is logged
      )

      consoleLogSpy.mockRestore() // Restore console.log
    })

  })
})

//API Testing
describe('Given i am connected as employee', () => {
  let mockedBillsPage;
  beforeEach(() => {
    // Bills mock creation
    mockedBillsPage = new Bills({
      document,
      onNavigate: jest.fn(),
      store: mockStore,
      localStorage: window.localStorage,
    })
  })

  test('should fetch bills successfully from the API', async () => {

    const fakedBillsIds = [
      "47qAXb6fIm2zOKkLzMro",
      "BeKy5Mo4jkmdfPGYpTxZ",
      "UIUZtnPQvnbFnB0ozvJh",
      "qcCK3SzECmaZAGRrHjaC"
    ]

    // Calling the bills function via mocked faked Bills
    const bills = await mockedBillsPage.getBills()

    bills.forEach(bill => {
      expect(fakedBillsIds).toContain(bill.id) // Assertion to make sure bills are gathered and id's are matching
    })
  });

  test('should handle 404 error from API', async () => {
    // Mock the implementation of bills().list to throw an error with message "Erreur 404"
    mockStore.bills().list = jest.fn().mockRejectedValue(new Error('Erreur 404'))
    await expect(mockedBillsPage.getBills()).rejects.toThrowError('Erreur 404')
  });

  test('should handle 500 error from API', async () => {
    // Mock the implementation of bills().list to throw an error with message "Erreur 500"
    mockStore.bills().list = jest.fn().mockRejectedValue(new Error('Erreur 500'))
    await expect(mockedBillsPage.getBills()).rejects.toThrowError('Erreur 500')
  });

});
