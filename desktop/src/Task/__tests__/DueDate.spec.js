/* eslint-env mocha, jest */

import getDefault from '../../shared/testUtils';
import DueDate from '../DueDate';

const defaultProps = {
  due: '',
};
const getActualDueDate = getDefault(DueDate, defaultProps);

it('should render', () => {
  getActualDueDate();
});
it('should be a <span />', () => {
  const wrapper = getActualDueDate();
  expect(wrapper.is('span.DueDate')).toEqual(true);
});
it('should show icon if due date is tomorrow', () => {
  const wrapper = getActualDueDate({ due: 'tomorrow' });
  expect(wrapper.find('small').length).toBeGreaterThan(0);
});
it('should show icon if due date is today', () => {
  const wrapper = getActualDueDate({ due: 'today' });
  expect(wrapper.find('small').length).toBeGreaterThan(0);
});
